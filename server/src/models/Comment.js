import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: [true, 'Ticket ID is required'],
    index: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author ID is required'],
    index: true
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    trim: true
  },
  isInternal: {
    type: Boolean,
    default: false,
    index: true
  },
  attachments: [{
    originalName: { type: String, required: true },
    storagePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }
  }]
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

commentSchema.index({ ticketId: 1, createdAt: 1 });

export const Comment = mongoose.model('Comment', commentSchema);
