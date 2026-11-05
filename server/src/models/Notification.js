import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: 150
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: [
      'TICKET_CREATED',
      'TICKET_ASSIGNED',
      'STATUS_CHANGED',
      'NEW_COMMENT',
      'SLA_WARNING',
      'SLA_BREACHED',
      'TICKET_RESOLVED',
      'TICKET_REOPENED'
    ],
    required: true
  },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    default: null
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

notificationSchema.index({ recipientId: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
