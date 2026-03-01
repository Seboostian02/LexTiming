export const ROLES = {
  EMPLOYEE: "EMPLOYEE",
  MANAGER: "MANAGER",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const DAY_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  LOCKED: "LOCKED",
} as const;

export type DayStatus = (typeof DAY_STATUS)[keyof typeof DAY_STATUS];

export const DAY_TYPE = {
  WORK: "WORK",
  CO: "CO",
  CM: "CM",
  HOLIDAY: "HOLIDAY",
} as const;

export type DayType = (typeof DAY_TYPE)[keyof typeof DAY_TYPE];

export const EMPLOYEE_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type EmployeeStatus =
  (typeof EMPLOYEE_STATUS)[keyof typeof EMPLOYEE_STATUS];

export const CLOCK_ACTIONS = {
  START: "START",
  PAUSE: "PAUSE",
  RESUME: "RESUME",
  STOP: "STOP",
} as const;

export type ClockAction = (typeof CLOCK_ACTIONS)[keyof typeof CLOCK_ACTIONS];

export const APPROVAL_DECISIONS = {
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export type ApprovalDecision =
  (typeof APPROVAL_DECISIONS)[keyof typeof APPROVAL_DECISIONS];

export const SCHEDULE_TYPES = {
  FIX: "FIX",
  FEREASTRA: "FEREASTRA",
  FLEX: "FLEX",
} as const;

export type ScheduleType = (typeof SCHEDULE_TYPES)[keyof typeof SCHEDULE_TYPES];

export const ANOMALY_TYPES = {
  MISSING_END: "MISSING_END",
  UNDER_HOURS: "UNDER_HOURS",
  OVER_HOURS: "OVER_HOURS",
  MISSING_DAY: "MISSING_DAY",
  EARLY_START: "EARLY_START",
  LATE_END: "LATE_END",
} as const;

export type AnomalyType = (typeof ANOMALY_TYPES)[keyof typeof ANOMALY_TYPES];

// Clock states derived from timesheet data
export const CLOCK_STATES = {
  NOT_CLOCKED: "NOT_CLOCKED",
  WORKING: "WORKING",
  ON_BREAK: "ON_BREAK",
  STOPPED: "STOPPED",
} as const;

export type ClockState = (typeof CLOCK_STATES)[keyof typeof CLOCK_STATES];

export const AUDIT_ACTIONS = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  LOCK: "LOCK",
  CLOCK_IN: "CLOCK_IN",
  CLOCK_OUT: "CLOCK_OUT",
  CLOCK_PAUSE: "CLOCK_PAUSE",
  CLOCK_RESUME: "CLOCK_RESUME",
  SUBMIT: "SUBMIT",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const AUDIT_ENTITIES = {
  TIMESHEET_DAY: "TimesheetDay",
  EMPLOYEE: "Employee",
  SCHEDULE: "Schedule",
} as const;

export type AuditEntity = (typeof AUDIT_ENTITIES)[keyof typeof AUDIT_ENTITIES];
