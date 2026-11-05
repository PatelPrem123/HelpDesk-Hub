import { Comment } from '../models/Comment.js';
import { Ticket } from '../models/Ticket.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { ROLES, TICKET_STATUS } from '../config/constants.js';
import { handleSlaClockTransition } from './slaEngine.js';
import { AppError } from '../middleware/errorHandler.js';
import { getIO } from '../sockets/index.js';

export async function createComment(
  ticketId,
  { content, isInternal = false, attachments = [] },
  user,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown'
) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  const isOwner = ticket.requesterId.equals(user._id);
  const isStaff = user.role === ROLES.TECHNICIAN || user.role === ROLES.ADMINISTRATOR;

  if (!isOwner && !isStaff) {
    throw new AppError('Forbidden: You are not authorized to comment on this ticket.', 403);
  }

  // Employees can NEVER post internal notes (DEC-007)
  let safeIsInternal = isInternal;
  if (!isStaff) {
    safeIsInternal = false;
  }

  // First Response SLA tracking: If staff responds for the first time
  if (isStaff && !ticket.firstResponseAt) {
    ticket.firstResponseAt = new Date();
  }

  // Auto-resume SLA clock if employee replies while ticket is in 'Pending User'
  let statusChanged = false;
  if (isOwner && ticket.status === TICKET_STATUS.PENDING_USER) {
    handleSlaClockTransition(ticket, TICKET_STATUS.IN_PROGRESS);
    ticket.status = TICKET_STATUS.IN_PROGRESS;
    statusChanged = true;
  }

  await ticket.save();

  const comment = await Comment.create({
    ticketId: ticket._id,
    authorId: user._id,
    content,
    isInternal: safeIsInternal,
    attachments
  });

  // Forensic Audit Log
  await AuditLog.create({
    action: safeIsInternal ? 'INTERNAL_NOTE_ADD' : 'COMMENT_ADD',
    entityType: 'Ticket',
    entityId: ticket._id,
    performedBy: user._id,
    newState: { commentId: comment._id, isInternal: safeIsInternal },
    ipAddress,
    userAgent
  });

  // Real-time WebSocket emission with privacy partitioning (DEC-006)
  const io = getIO();
  if (io) {
    const payload = {
      comment: {
        _id: comment._id,
        ticketId: ticket._id,
        content: comment.content,
        isInternal: comment.isInternal,
        attachments: comment.attachments,
        createdAt: comment.createdAt,
        author: {
          _id: user._id,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl
        }
      }
    };

    if (safeIsInternal) {
      // Only emit to technicians and admin channels
      io.to('role_technicians').emit('comment:new', payload);
      io.to(`ticket_${ticket._id}_internal`).emit('comment:new', payload);
    } else {
      // Public comment: emit to general ticket room
      io.to(`ticket_${ticket._id}`).emit('comment:new', payload);
    }

    if (statusChanged) {
      io.to(`ticket_${ticket._id}`).emit('ticket:status_changed', {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        newStatus: ticket.status
      });
    }
  }

  // Send Notification if staff commented on user's ticket
  if (isStaff && !safeIsInternal && !isOwner) {
    await Notification.create({
      recipientId: ticket.requesterId,
      title: `Update on ${ticket.ticketNumber}`,
      message: `${user.name} added a comment on your ticket.`,
      type: 'NEW_COMMENT',
      ticketId: ticket._id
    });
  }

  return comment.populate('authorId', 'name role avatarUrl department');
}

export async function getComments(ticketId, user) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  const isOwner = ticket.requesterId.equals(user._id);
  const isStaff = user.role === ROLES.TECHNICIAN || user.role === ROLES.ADMINISTRATOR;

  if (!isOwner && !isStaff) {
    throw new AppError('Forbidden: Access denied to ticket comments.', 403);
  }

  const query = { ticketId };

  // CRITICAL PRIVACY BOUNDARY: Non-staff can NEVER see internal notes (DEC-006, DEC-007)
  if (!isStaff) {
    query.isInternal = false;
  }

  const comments = await Comment.find(query)
    .sort({ createdAt: 1 })
    .populate('authorId', 'name role avatarUrl department');

  return comments;
}

export async function getTicketTimeline(ticketId, user) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new AppError('Ticket not found', 404);

  const isOwner = ticket.requesterId.equals(user._id);
  const isStaff = user.role === ROLES.TECHNICIAN || user.role === ROLES.ADMINISTRATOR;

  if (!isOwner && !isStaff) throw new AppError('Forbidden', 403);

  const auditQuery = { entityId: ticketId, entityType: 'Ticket' };
  if (!isStaff) {
    auditQuery.action = { $ne: 'INTERNAL_NOTE_ADD' };
  }

  const auditEvents = await AuditLog.find(auditQuery)
    .sort({ timestamp: 1 })
    .populate('performedBy', 'name role avatarUrl');

  return auditEvents;
}
