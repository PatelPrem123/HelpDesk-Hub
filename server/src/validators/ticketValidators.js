import { z } from 'zod';
import { TICKET_STATUS, TICKET_PRIORITY } from '../config/constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createTicketSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(5000),
  category: z.string().regex(objectIdRegex, 'Invalid Category ID format'),
  subcategory: z.string().trim().min(2, 'Subcategory is required'),
  priority: z.enum(Object.values(TICKET_PRIORITY)).default(TICKET_PRIORITY.MEDIUM)
});

export const updateStatusSchema = z.object({
  status: z.enum(Object.values(TICKET_STATUS)),
  resolutionSummary: z.string().trim().max(2000).optional()
}).refine(data => {
  if (data.status === TICKET_STATUS.RESOLVED && !data.resolutionSummary) {
    return false;
  }
  return true;
}, {
  message: 'A resolution summary is required when transitioning a ticket to Resolved',
  path: ['resolutionSummary']
});

export const assignTicketSchema = z.object({
  assignedTechnicianId: z.string().regex(objectIdRegex, 'Invalid Technician ID format')
});

export const updatePrioritySchema = z.object({
  priority: z.enum(Object.values(TICKET_PRIORITY))
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment content cannot be empty').max(2000),
  isInternal: z.boolean().default(false)
});
