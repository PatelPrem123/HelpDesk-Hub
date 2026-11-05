import mongoose from 'mongoose';
import { TICKET_PRIORITY } from '../config/constants.js';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  subcategories: [{
    type: String,
    trim: true
  }],
  defaultPriority: {
    type: String,
    enum: Object.values(TICKET_PRIORITY),
    default: TICKET_PRIORITY.MEDIUM
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

export const Category = mongoose.model('Category', categorySchema);
