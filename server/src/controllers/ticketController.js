import {
  createTicketSchema,
  updateStatusSchema,
  assignTicketSchema,
  updatePrioritySchema
} from '../validators/ticketValidators.js';
import * as ticketService from '../services/ticketService.js';

export async function createTicket(req, res, next) {
  try {
    const validatedData = createTicketSchema.parse(req.body);
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const ticket = await ticketService.createTicket(validatedData, req.user, ipAddress, userAgent);

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: { ticket }
    });
  } catch (error) {
    next(error);
  }
}

export async function getTickets(req, res, next) {
  try {
    const result = await ticketService.getTickets(req.query, req.user);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function getTicketById(req, res, next) {
  try {
    const ticket = await ticketService.getTicketById(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: { ticket }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const validatedData = updateStatusSchema.parse(req.body);
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const ticket = await ticketService.updateTicketStatus(
      req.params.id,
      validatedData,
      req.user,
      ipAddress,
      userAgent
    );

    res.status(200).json({
      success: true,
      message: `Ticket status transitioned to ${ticket.status}`,
      data: { ticket }
    });
  } catch (error) {
    next(error);
  }
}

export async function assignTicket(req, res, next) {
  try {
    const { assignedTechnicianId } = assignTicketSchema.parse(req.body);
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const ticket = await ticketService.assignTechnician(
      req.params.id,
      assignedTechnicianId,
      req.user,
      ipAddress,
      userAgent
    );

    res.status(200).json({
      success: true,
      message: 'Technician successfully assigned',
      data: { ticket }
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePriority(req, res, next) {
  try {
    const { priority } = updatePrioritySchema.parse(req.body);
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const ticket = await ticketService.updatePriority(
      req.params.id,
      priority,
      req.user,
      ipAddress,
      userAgent
    );

    res.status(200).json({
      success: true,
      message: `Priority updated to ${priority}`,
      data: { ticket }
    });
  } catch (error) {
    next(error);
  }
}
