import { Ticket } from '../models/Ticket.js';
import { Category } from '../models/Category.js';
import { SLAPolicy } from '../models/SLAPolicy.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { ROLES, TICKET_STATUS, VALID_FSM_TRANSITIONS, DEFAULT_SLA_POLICIES } from '../config/constants.js';
import { getNextTicketNumber } from './sequenceService.js';
import { calculateTicketDeadlines, handleSlaClockTransition } from './slaEngine.js';
import { AppError } from '../middleware/errorHandler.js';
import { getIO } from '../sockets/index.js';

export async function createTicket(ticketData, user, ipAddress = '127.0.0.1', userAgent = 'Unknown') {
  const category = await Category.findById(ticketData.category);
  if (!category || !category.isActive) {
    throw new AppError('The selected Category does not exist or is inactive.', 400);
  }

  // Ensure default SLA Policy exists for this priority with concurrency-safe upsert
  const defaults = DEFAULT_SLA_POLICIES[ticketData.priority] || DEFAULT_SLA_POLICIES.Medium;
  let slaPolicy = await SLAPolicy.findOneAndUpdate(
    { priority: ticketData.priority },
    {
      $setOnInsert: {
        name: `Default ${ticketData.priority} SLA`,
        priority: ticketData.priority,
        firstResponseMinutes: defaults.firstResponseMinutes,
        resolutionHours: defaults.resolutionHours,
        escalationThresholdPercent: defaults.escalationThresholdPercent
      }
    },
    { upsert: true, new: true }
  );

  // Atomic sequence generation (HD-YYYY-XXXX)
  const ticketNumber = await getNextTicketNumber();

  // Business-hours SLA calculation
  const { firstResponseDeadline, resolutionDeadline } = await calculateTicketDeadlines(ticketData.priority);

  const ticket = await Ticket.create({
    ticketNumber,
    title: ticketData.title,
    description: ticketData.description,
    category: category._id,
    subcategory: ticketData.subcategory,
    priority: ticketData.priority,
    status: TICKET_STATUS.NEW,
    requesterId: user._id,
    slaPolicyId: slaPolicy._id,
    firstResponseDeadline,
    resolutionDeadline
  });

  // Forensic Audit Log (DEC-010)
  await AuditLog.create({
    action: 'TICKET_CREATE',
    entityType: 'Ticket',
    entityId: ticket._id,
    performedBy: user._id,
    newState: {
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      priority: ticket.priority,
      status: ticket.status
    },
    ipAddress,
    userAgent
  });

  // Real-time notification to technician pool
  const io = getIO();
  if (io) {
    io.to('role_technicians').emit('ticket:created', {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      priority: ticket.priority,
      requesterName: user.name,
      createdAt: ticket.createdAt
    });
  }

  return ticket.populate([
    { path: 'requesterId', select: 'name email department avatarUrl' },
    { path: 'category', select: 'name subcategories' }
  ]);
}

export async function getTickets(queryParams, user) {
  const {
    status,
    priority,
    category,
    search,
    unassigned,
    page = 1,
    limit = 20
  } = queryParams;

  const filter = {};

  // Role-based boundary enforcement (DEC-007)
  if (user.role === ROLES.EMPLOYEE) {
    filter.requesterId = user._id;
  } else {
    // Technicians & Admins can filter by assignee or unassigned queue
    if (unassigned === 'true') {
      filter.assignedTechnicianId = null;
    }
  }

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;

  if (search) {
    filter.$or = [
      { ticketNumber: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [tickets, total] = await Promise.all([
    Ticket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('requesterId', 'name email department avatarUrl')
      .populate('assignedTechnicianId', 'name email avatarUrl')
      .populate('category', 'name subcategories'),
    Ticket.countDocuments(filter)
  ]);

  return {
    tickets,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  };
}

export async function getTicketById(ticketId, user) {
  const ticket = await Ticket.findById(ticketId)
    .populate('requesterId', 'name email department avatarUrl')
    .populate('assignedTechnicianId', 'name email avatarUrl')
    .populate('category', 'name subcategories')
    .populate('slaPolicyId');

  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  // Broken Object Level Authorization (BOLA/IDOR) Defense
  if (user.role === ROLES.EMPLOYEE && !ticket.requesterId._id.equals(user._id)) {
    throw new AppError('Forbidden: You do not have permission to view this ticket.', 403);
  }

  return ticket;
}

export async function updateTicketStatus(ticketId, { status: newStatus, resolutionSummary }, user, ipAddress, userAgent) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  const currentStatus = ticket.status;

  // 1. Employee status transition restrictions (Chapter 3 RBAC Matrix)
  if (user.role === ROLES.EMPLOYEE) {
    const isOwner = ticket.requesterId.equals(user._id);
    if (!isOwner) {
      throw new AppError('Forbidden: You do not own this ticket.', 403);
    }

    const isAcceptResolution = currentStatus === TICKET_STATUS.RESOLVED && newStatus === TICKET_STATUS.CLOSED;
    const isDisputeResolution = currentStatus === TICKET_STATUS.RESOLVED && newStatus === TICKET_STATUS.REOPENED;

    if (!isAcceptResolution && !isDisputeResolution) {
      throw new AppError('Employees may only accept resolution (Close) or dispute resolution (Reopen).', 403);
    }

    // 48-hour reopen window verification
    if (isDisputeResolution && ticket.resolvedAt) {
      const hoursSinceResolved = (Date.now() - new Date(ticket.resolvedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceResolved > 48) {
        throw new AppError('The 48-hour window to reopen this ticket has expired. Please submit a new ticket.', 400);
      }
    }
  }

  // 2. Validate Finite State Machine transition (DEC-003)
  const allowedNextStatuses = VALID_FSM_TRANSITIONS[currentStatus] || [];
  if (!allowedNextStatuses.includes(newStatus)) {
    throw new AppError(`Invalid state transition: Cannot transition from '${currentStatus}' to '${newStatus}'.`, 400);
  }

  // 3. Handle SLA clock pause / resume
  handleSlaClockTransition(ticket, newStatus);

  // 4. Update status-specific timestamps
  const previousState = { status: currentStatus };
  ticket.status = newStatus;

  if (newStatus === TICKET_STATUS.RESOLVED) {
    ticket.resolvedAt = new Date();
    ticket.resolutionSummary = resolutionSummary;
  } else if (newStatus === TICKET_STATUS.CLOSED) {
    ticket.closedAt = new Date();
  }

  await ticket.save();

  // 5. Immutable Forensic Audit Log
  await AuditLog.create({
    action: 'STATUS_CHANGE',
    entityType: 'Ticket',
    entityId: ticket._id,
    performedBy: user._id,
    previousState,
    newState: { status: newStatus, resolutionSummary: ticket.resolutionSummary },
    ipAddress,
    userAgent
  });

  // 6. Real-time notifications
  const io = getIO();
  if (io) {
    io.to(`ticket_${ticket._id}`).emit('ticket:status_changed', {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      previousStatus: currentStatus,
      newStatus,
      changedBy: { id: user._id, name: user.name, role: user.role }
    });
  }

  // Alert requester on resolution
  if (newStatus === TICKET_STATUS.RESOLVED) {
    await Notification.create({
      recipientId: ticket.requesterId,
      title: `Ticket ${ticket.ticketNumber} Resolved`,
      message: `Your issue has been resolved: ${resolutionSummary || 'Resolution confirmed by technician.'}`,
      type: 'TICKET_RESOLVED',
      ticketId: ticket._id
    });
  }

  return ticket.populate([
    { path: 'requesterId', select: 'name email department avatarUrl' },
    { path: 'assignedTechnicianId', select: 'name email avatarUrl' },
    { path: 'category', select: 'name subcategories' }
  ]);
}

export async function assignTechnician(ticketId, technicianId, user, ipAddress, userAgent) {
  const [ticket, technician] = await Promise.all([
    Ticket.findById(ticketId),
    User.findById(technicianId)
  ]);

  if (!ticket) throw new AppError('Ticket not found', 404);
  if (!technician || !technician.isActive) throw new AppError('Technician not found or inactive', 404);

  if (technician.role !== ROLES.TECHNICIAN && technician.role !== ROLES.ADMINISTRATOR) {
    throw new AppError('User cannot be assigned as technician: Invalid role.', 400);
  }

  const previousAssignee = ticket.assignedTechnicianId;
  ticket.assignedTechnicianId = technician._id;

  // Auto-transition from New or Open to Assigned
  if (ticket.status === TICKET_STATUS.NEW || ticket.status === TICKET_STATUS.OPEN) {
    ticket.status = TICKET_STATUS.ASSIGNED;
  }

  await ticket.save();

  // Forensic Audit Log
  await AuditLog.create({
    action: 'ASSIGN',
    entityType: 'Ticket',
    entityId: ticket._id,
    performedBy: user._id,
    previousState: { assignedTechnicianId: previousAssignee },
    newState: { assignedTechnicianId: technician._id, technicianName: technician.name },
    ipAddress,
    userAgent
  });

  // Notify assigned technician and requester
  await Notification.create({
    recipientId: technician._id,
    title: `Assigned: ${ticket.ticketNumber}`,
    message: `You were assigned ticket: ${ticket.title}`,
    type: 'TICKET_ASSIGNED',
    ticketId: ticket._id
  });

  const io = getIO();
  if (io) {
    io.to(`user_${technician._id}`).emit('ticket:assigned', {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title
    });
  }

  return ticket.populate([
    { path: 'requesterId', select: 'name email department avatarUrl' },
    { path: 'assignedTechnicianId', select: 'name email avatarUrl' },
    { path: 'category', select: 'name subcategories' }
  ]);
}

export async function updatePriority(ticketId, newPriority, user, ipAddress, userAgent) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new AppError('Ticket not found', 404);

  const previousPriority = ticket.priority;
  ticket.priority = newPriority;

  // Recalculate SLA targets with updated priority
  const { resolutionDeadline } = await calculateTicketDeadlines(newPriority, ticket.createdAt);
  ticket.resolutionDeadline = resolutionDeadline;

  await ticket.save();

  await AuditLog.create({
    action: 'PRIORITY_CHANGE',
    entityType: 'Ticket',
    entityId: ticket._id,
    performedBy: user._id,
    previousState: { priority: previousPriority },
    newState: { priority: newPriority },
    ipAddress,
    userAgent
  });

  return ticket;
}
