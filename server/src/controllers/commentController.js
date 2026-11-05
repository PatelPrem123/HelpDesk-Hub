import * as commentService from '../services/commentService.js';
import { createCommentSchema } from '../validators/ticketValidators.js';
import { Ticket } from '../models/Ticket.js';
import { AppError } from '../middleware/errorHandler.js';
import { ROLES } from '../config/constants.js';
import path from 'path';
import fs from 'fs';

export async function createComment(req, res, next) {
  try {
    const validatedData = createCommentSchema.parse(req.body);
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const comment = await commentService.createComment(
      req.params.ticketId,
      validatedData,
      req.user,
      ipAddress,
      userAgent
    );

    res.status(201).json({
      success: true,
      message: 'Comment posted successfully',
      data: { comment }
    });
  } catch (error) {
    next(error);
  }
}

export async function getComments(req, res, next) {
  try {
    const comments = await commentService.getComments(req.params.ticketId, req.user);
    res.status(200).json({
      success: true,
      data: { comments }
    });
  } catch (error) {
    next(error);
  }
}

export async function getTicketTimeline(req, res, next) {
  try {
    const timeline = await commentService.getTicketTimeline(req.params.ticketId, req.user);
    res.status(200).json({
      success: true,
      data: { timeline }
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadAttachment(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError('No file provided for upload', 400);
    }

    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) throw new AppError('Ticket not found', 404);

    const isOwner = ticket.requesterId.equals(req.user._id);
    const isStaff = req.user.role === ROLES.TECHNICIAN || req.user.role === ROLES.ADMINISTRATOR;

    if (!isOwner && !isStaff) {
      // Clean up uploaded file if unauthorized
      fs.unlinkSync(req.file.path);
      throw new AppError('Forbidden: You are not authorized to upload attachments to this ticket.', 403);
    }

    const attachmentRecord = {
      originalName: req.file.originalname,
      storagePath: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date()
    };

    ticket.attachments.push(attachmentRecord);
    await ticket.save();

    res.status(201).json({
      success: true,
      message: 'Attachment uploaded successfully',
      data: {
        attachment: attachmentRecord
      }
    });
  } catch (error) {
    // Ensure any uploaded file on disk is immediately cleaned up if processing fails
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        // Silently ignore unlink error in catch handler
      }
    }
    next(error);
  }
}
