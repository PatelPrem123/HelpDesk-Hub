import { Ticket } from '../models/Ticket.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { ROLES, TICKET_STATUS } from '../config/constants.js';
import { getIO } from '../sockets/index.js';
import { logger } from '../utils/logger.js';

let intervalId = null;

export async function evaluateSlaBreaches() {
  const now = new Date();

  // Find all active un-breached tickets whose resolution deadline has passed
  const activeUnbreachedTickets = await Ticket.find({
    status: { $nin: [TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED, TICKET_STATUS.CANCELLED] },
    isSlaPaused: false,
    isBreached: false,
    resolutionDeadline: { $lte: now }
  }).populate('assignedTechnicianId', 'name email');

  for (const ticket of activeUnbreachedTickets) {
    ticket.isBreached = true;
    await ticket.save();

    logger.warn(`SLA BREACH DETECTED: Ticket ${ticket.ticketNumber} exceeded resolution deadline`);

    // Audit log
    await AuditLog.create({
      action: 'SLA_BREACH',
      entityType: 'Ticket',
      entityId: ticket._id,
      performedBy: ticket.requesterId, // System event recorded against ticket context
      newState: { isBreached: true, breachedAt: now },
      ipAddress: '127.0.0.1',
      userAgent: 'SLA-Breach-Daemon'
    });

    // Notify assigned technician (if any)
    if (ticket.assignedTechnicianId) {
      await Notification.create({
        recipientId: ticket.assignedTechnicianId._id,
        title: `CRITICAL: SLA Breached on ${ticket.ticketNumber}`,
        message: `Resolution commitment expired for ticket: ${ticket.title}`,
        type: 'SLA_BREACHED',
        ticketId: ticket._id
      });
    }

    // Emit real-time warning to all technicians and administrators
    const io = getIO();
    if (io) {
      io.to('role_technicians').emit('sla:breached', {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        priority: ticket.priority,
        breachedAt: now,
        assigneeName: ticket.assignedTechnicianId?.name || 'Unassigned'
      });
    }
  }

  return activeUnbreachedTickets.length;
}

export function startSlaDaemon(intervalMs = 60000) {
  if (intervalId) return;

  logger.info(`Starting SLA Monitoring Daemon [Interval: ${intervalMs}ms]`);
  intervalId = setInterval(async () => {
    try {
      await evaluateSlaBreaches();
    } catch (err) {
      logger.error('Error executing SLA evaluation daemon cycle', err);
    }
  }, intervalMs);
}

export function stopSlaDaemon() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
