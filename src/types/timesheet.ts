import type { ClockAction, ClockState, DayStatus, DayType } from "@/lib/constants";

export interface Break {
  start: string; // ISO timestamp
  end?: string;  // ISO timestamp, undefined if break is ongoing
}

export interface TimesheetDay {
  id: string;
  employeeId: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  breaks: Break[];
  totalMinutes: number | null;
  status: DayStatus;
  dayType: DayType;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    firstName: string;
    lastName: string;
    email: string;
    department: string | null;
  };
}

export interface TodayTimesheet extends TimesheetDay {
  clockState: ClockState;
  elapsedMinutes: number; // current working time in minutes
}

export interface ClockActionRequest {
  action: ClockAction;
}

export interface CalendarDay {
  id: string;
  date: string;
  status: DayStatus;
  dayType: DayType;
  totalMinutes: number | null;
  anomalies: string[];
}

export interface UpdateTimesheetRequest {
  startTime?: string;
  endTime?: string;
  breaks?: Break[];
  note?: string;
}

export interface ApprovalEntry {
  decision: string;
  comment: string | null;
  createdAt: string;
  approver: {
    firstName: string;
    lastName: string;
  };
}

export interface TimesheetDayDetail extends TodayTimesheet {
  anomalies: string[];
  approvals: ApprovalEntry[];
}

export interface EmployeeAlert {
  type: "MISSING_YESTERDAY" | "REJECTED_DAYS" | "OPEN_DAY";
  message: string;
  severity: "warning" | "critical";
  count?: number;
}
