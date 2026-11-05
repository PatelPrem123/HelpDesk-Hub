import mongoose from 'mongoose';
import { TICKET_STATUS, TICKET_PRIORITY } from '../config/constants.js';

const fileAttachmentSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  storagePath: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    required: [true, 'Ticket sequence number is required'],
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category reference is required'],
    index: true
  },
  subcategory: {
    type: String,
    required: [true, 'Subcategory is required'],
    trim: true
  },
  priority: {
    type: String,
    enum: Object.values(TICKET_PRIORITY),
    default: TICKET_PRIORITY.MEDIUM,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(TICKET_STATUS),
    default: TICKET_STATUS.NEW,
    index: true
  },
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Requester ID is required'],
    index: true
  },
  assignedTechnicianId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  attachments: [fileAttachmentSchema],
  slaPolicyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SLAPolicy',
    required: [true, 'SLA Policy reference is required']
  },
  firstResponseDeadline: {
    type: Date,
    required: true,
    index: true
  },
  resolutionDeadline: {
    type: Date,
    required: true,
    index: true
  },
  firstResponseAt: {
    type: Date,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },
  resolutionSummary: {
    type: String,
    default: null,
    maxlength: 2000
  },
  isBreached: {
    type: Boolean,
    default: false,
    index: true
  },
  isSlaPaused: {
    type: Boolean,
    default: false
  },
  lastPausedAt: {
    type: Date,
    default: null
  },
  totalPausedDurationMs: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound indexes for optimized query performance (DEC-002)
ticketSchema.index({ isBreached: 1, status: 1, resolutionDeadline: 1 });
ticketSchema.index({ requesterId: 1, createdAt: -1 });
ticketSchema.index({ assignedTechnicianId: 1, status: 1 });
ticketSchema.index({ category: 1, status: 1 });

export const Ticket = mongoose.model('Ticket', ticketSchema);
