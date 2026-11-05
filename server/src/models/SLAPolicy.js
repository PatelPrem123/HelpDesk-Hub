import mongoose from 'mongoose';
import { TICKET_PRIORITY, BUSINESS_HOURS } from '../config/constants.js';

const slaPolicySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'SLA Policy name is required'],
    trim: true
  },
  priority: {
    type: String,
    enum: Object.values(TICKET_PRIORITY),
    required: [true, 'Priority level is required'],
    unique: true
  },
  firstResponseMinutes: {
    type: Number,
    required: [true, 'Target first response in minutes is required'],
    min: [5, 'First response target must be at least 5 minutes']
  },
  resolutionHours: {
    type: Number,
    required: [true, 'Target resolution in business hours is required'],
    min: [1, 'Resolution target must be at least 1 hour']
  },
  escalationThresholdPercent: {
    type: Number,
    default: 80,
    min: 50,
    max: 95
  },
  businessHours: {
    startHour: { type: Number, default: BUSINESS_HOURS.START_HOUR },
    endHour: { type: Number, default: BUSINESS_HOURS.END_HOUR },
    workDays: { type: [Number], default: BUSINESS_HOURS.WORK_DAYS }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export const SLAPolicy = mongoose.model('SLAPolicy', slaPolicySchema);
