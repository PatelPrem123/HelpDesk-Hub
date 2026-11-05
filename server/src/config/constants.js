export const ROLES = {
  EMPLOYEE: 'Employee',
  TECHNICIAN: 'Technician',
  ADMINISTRATOR: 'Administrator'
};

export const TICKET_STATUS = {
  NEW: 'New',
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  PENDING_USER: 'Pending User',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
  CANCELLED: 'Cancelled'
};

export const TICKET_PRIORITY = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
};

export const VALID_FSM_TRANSITIONS = {
  [TICKET_STATUS.NEW]: [TICKET_STATUS.OPEN, TICKET_STATUS.ASSIGNED, TICKET_STATUS.CANCELLED],
  [TICKET_STATUS.OPEN]: [TICKET_STATUS.ASSIGNED, TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.CANCELLED],
  [TICKET_STATUS.ASSIGNED]: [TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.PENDING_USER, TICKET_STATUS.ASSIGNED],
  [TICKET_STATUS.IN_PROGRESS]: [TICKET_STATUS.PENDING_USER, TICKET_STATUS.RESOLVED, TICKET_STATUS.ASSIGNED],
  [TICKET_STATUS.PENDING_USER]: [TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.RESOLVED, TICKET_STATUS.CANCELLED],
  [TICKET_STATUS.RESOLVED]: [TICKET_STATUS.CLOSED, TICKET_STATUS.REOPENED],
  [TICKET_STATUS.CLOSED]: [TICKET_STATUS.REOPENED], // Admin override only
  [TICKET_STATUS.REOPENED]: [TICKET_STATUS.ASSIGNED, TICKET_STATUS.IN_PROGRESS],
  [TICKET_STATUS.CANCELLED]: [] // Terminal
};

export const BUSINESS_HOURS = {
  START_HOUR: 9,
  END_HOUR: 18,
  WORK_DAYS: [1, 2, 3, 4, 5] // Monday through Friday (0 = Sunday, 6 = Saturday)
};

export const DEFAULT_SLA_POLICIES = {
  [TICKET_PRIORITY.CRITICAL]: {
    firstResponseMinutes: 30,
    resolutionHours: 4,
    escalationThresholdPercent: 75
  },
  [TICKET_PRIORITY.HIGH]: {
    firstResponseMinutes: 120, // 2 business hours
    resolutionHours: 8,
    escalationThresholdPercent: 80
  },
  [TICKET_PRIORITY.MEDIUM]: {
    firstResponseMinutes: 240, // 4 business hours
    resolutionHours: 24, // 3 business days
    escalationThresholdPercent: 85
  },
  [TICKET_PRIORITY.LOW]: {
    firstResponseMinutes: 480, // 8 business hours
    resolutionHours: 48, // 6 business days
    escalationThresholdPercent: 90
  }
};
