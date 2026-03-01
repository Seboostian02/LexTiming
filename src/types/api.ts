export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface Schedule {
  id: string;
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  startWindowEnd: string | null;
  endWindowStart: string | null;
  earlyStartMinutes: number;
  lateEndMinutes: number;
  minHoursPerDay: number;
  breakMinutes: number;
  createdAt: string;
}

export interface ApprovalItem {
  id: string;
  timesheetDayId: string;
  timesheetDay: {
    id: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    breaks: string;
    totalMinutes: number | null;
    status: string;
    employee: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      department: string | null;
      manager: {
        id: string;
        firstName: string;
        lastName: string;
      } | null;
    };
  };
  createdAt: string;
}

export interface ApprovalRequest {
  decision: "APPROVED" | "REJECTED";
  comment?: string;
}

export interface MonthReportRow {
  employeeId: string;
  employeeName: string;
  department: string | null;
  totalDaysWorked: number;
  totalHours: number;
  avgHoursPerDay: number;
  overtimeHours: number;
  absentDays: number;
  leaveDays: number;
}
