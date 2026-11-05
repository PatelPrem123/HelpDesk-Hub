import { BUSINESS_HOURS, DEFAULT_SLA_POLICIES } from '../config/constants.js';
import { SLAPolicy } from '../models/SLAPolicy.js';

/**
 * Checks if a given date falls on an organization working day (Mon-Fri)
 */
export function isWorkingDay(date) {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  return BUSINESS_HOURS.WORK_DAYS.includes(day);
}

/**
 * Normalizes a date to fall within working hours (09:00 - 18:00 Mon-Fri).
 * If outside working hours, advances to the start of the next working day (09:00).
 */
export function normalizeToWorkingHours(date) {
  const current = new Date(date);

  while (!isWorkingDay(current) || current.getHours() >= BUSINESS_HOURS.END_HOUR) {
    // If past end hour or on a weekend, advance to next day at start hour
    current.setDate(current.getDate() + 1);
    current.setHours(BUSINESS_HOURS.START_HOUR, 0, 0, 0);
  }

  // If before start hour on a working day, advance to start hour
  if (current.getHours() < BUSINESS_HOURS.START_HOUR) {
    current.setHours(BUSINESS_HOURS.START_HOUR, 0, 0, 0);
  }

  return current;
}

/**
 * Projects a target duration (in minutes) forward across business hours only.
 */
export function addBusinessMinutes(startDate, minutesToAdd) {
  let current = normalizeToWorkingHours(startDate);
  let remainingMinutes = minutesToAdd;

  while (remainingMinutes > 0) {
    const endOfCurrentWorkDay = new Date(current);
    endOfCurrentWorkDay.setHours(BUSINESS_HOURS.END_HOUR, 0, 0, 0);

    const availableMinutesToday = Math.floor((endOfCurrentWorkDay - current) / (1000 * 60));

    if (remainingMinutes <= availableMinutesToday) {
      current = new Date(current.getTime() + remainingMinutes * 60 * 1000);
      remainingMinutes = 0;
    } else {
      remainingMinutes -= availableMinutesToday;
      // Advance to 09:00 of next day
      current.setDate(current.getDate() + 1);
      current.setHours(BUSINESS_HOURS.START_HOUR, 0, 0, 0);
      current = normalizeToWorkingHours(current);
    }
  }

  return current;
}

/**
 * Calculates initial First Response and Resolution deadlines for a ticket
 */
export async function calculateTicketDeadlines(priority, startTime = new Date()) {
  let policy = await SLAPolicy.findOne({ priority, isActive: true });

  if (!policy) {
    const defaults = DEFAULT_SLA_POLICIES[priority] || DEFAULT_SLA_POLICIES.Medium;
    policy = {
      firstResponseMinutes: defaults.firstResponseMinutes,
      resolutionHours: defaults.resolutionHours
    };
  }

  const firstResponseDeadline = addBusinessMinutes(startTime, policy.firstResponseMinutes);
  const resolutionDeadline = addBusinessMinutes(startTime, policy.resolutionHours * 60);

  return {
    firstResponseDeadline,
    resolutionDeadline
  };
}

/**
 * Handles clock pause and resume when switching into or out of 'Pending User'
 */
export function handleSlaClockTransition(ticket, newStatus) {
  const now = new Date();

  // Entering Pending User -> Pause clock
  if (newStatus === 'Pending User' && !ticket.isSlaPaused) {
    ticket.isSlaPaused = true;
    ticket.lastPausedAt = now;
  }
  // Exiting Pending User -> Resume clock and shift deadlines forward
  else if (ticket.status === 'Pending User' && newStatus !== 'Pending User' && ticket.isSlaPaused) {
    ticket.isSlaPaused = false;
    const pausedDeltaMs = now.getTime() - new Date(ticket.lastPausedAt).getTime();
    ticket.totalPausedDurationMs = (ticket.totalPausedDurationMs || 0) + pausedDeltaMs;

    // Extend both deadlines by the exact paused delta
    if (ticket.firstResponseDeadline) {
      ticket.firstResponseDeadline = new Date(ticket.firstResponseDeadline.getTime() + pausedDeltaMs);
    }
    if (ticket.resolutionDeadline) {
      ticket.resolutionDeadline = new Date(ticket.resolutionDeadline.getTime() + pausedDeltaMs);
    }
    ticket.lastPausedAt = null;
  }
}
