import { prisma } from "@/lib/prisma";
import {
  DAY_STATUS,
  DAY_TYPE,
  ROLES,
} from "@/lib/constants";
import type { Break, TodayTimesheet, EmployeeAlert } from "@/types/timesheet";
import {
  parseBreaks,
  deriveClockState,
  computeElapsedMinutes,
  detectAnomalies,
} from "@/lib/timesheet-utils";
import { createAuditLog } from "@/services/audit.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns today at midnight UTC, used for the @@unique(employeeId, date) match. */
function todayDateUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

/** Map a Prisma TimesheetDay row to the TodayTimesheet API shape. */
function toTodayTimesheet(
  record: {
    id: string;
    employeeId: string;
    date: Date;
    startTime: Date | null;
    endTime: Date | null;
    breaks: string;
    totalMinutes: number | null;
    status: string;
    dayType: string;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
  }
): TodayTimesheet {
  return {
    id: record.id,
    employeeId: record.employeeId,
    date: record.date.toISOString(),
    startTime: record.startTime?.toISOString() ?? null,
    endTime: record.endTime?.toISOString() ?? null,
    breaks: parseBreaks(record.breaks),
    totalMinutes: record.totalMinutes,
    status: record.status as TodayTimesheet["status"],
    dayType: record.dayType as TodayTimesheet["dayType"],
    note: record.note,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    clockState: deriveClockState(record),
    elapsedMinutes: computeElapsedMinutes(record),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the current employee's TimesheetDay for today.
 * Returns `null` when no record exists yet.
 */
export async function getTodayTimesheet(
  employeeId: string
): Promise<TodayTimesheet | null> {
  const today = todayDateUTC();

  const record = await prisma.timesheetDay.findUnique({
    where: {
      employeeId_date: {
        employeeId,
        date: today,
      },
    },
  });

  if (!record) return null;
  return toTodayTimesheet(record);
}

/**
 * Clock-in: create a new TimesheetDay for today with startTime = now.
 */
export async function clockIn(employeeId: string): Promise<void> {
  const today = todayDateUTC();

  // Check for existing open day
  const existing = await prisma.timesheetDay.findUnique({
    where: {
      employeeId_date: {
        employeeId,
        date: today,
      },
    },
  });

  if (existing && existing.startTime && !existing.endTime) {
    throw new Error("Already clocked in today");
  }

  if (existing && existing.dayType !== DAY_TYPE.WORK) {
    throw new Error("Today is marked as a leave day and cannot be clocked");
  }

  if (existing) {
    // Record exists (e.g. pre-created leave day that is WORK but has no startTime,
    // or a previously stopped day), update it with a new startTime
    throw new Error("A timesheet entry already exists for today");
  }

  const created = await prisma.timesheetDay.create({
    data: {
      employeeId,
      date: today,
      startTime: new Date(),
      status: DAY_STATUS.DRAFT,
      dayType: DAY_TYPE.WORK,
      breaks: "[]",
    },
  });

  await createAuditLog({
    entity: "TimesheetDay",
    entityId: created.id,
    action: "CLOCK_IN",
    actorId: employeeId,
    after: { date: created.date.toISOString(), startTime: created.startTime?.toISOString() },
  });
}

/**
 * Clock-pause: add a new open break entry.
 */
export async function clockPause(employeeId: string): Promise<void> {
  const today = todayDateUTC();

  const record = await prisma.timesheetDay.findUnique({
    where: {
      employeeId_date: {
        employeeId,
        date: today,
      },
    },
  });

  if (!record || !record.startTime || record.endTime) {
    throw new Error("Not currently clocked in");
  }

  const breaks = parseBreaks(record.breaks);
  const lastBreak = breaks.length > 0 ? breaks[breaks.length - 1] : null;

  if (lastBreak && !lastBreak.end) {
    throw new Error("Already on a break");
  }

  breaks.push({ start: new Date().toISOString() });

  const updated = await prisma.timesheetDay.update({
    where: { id: record.id },
    data: { breaks: JSON.stringify(breaks) },
  });

  await createAuditLog({
    entity: "TimesheetDay",
    entityId: record.id,
    action: "CLOCK_PAUSE",
    actorId: employeeId,
    before: { breaks: record.breaks },
    after: { breaks: updated.breaks },
  });
}

/**
 * Clock-resume: close the last open break entry.
 */
export async function clockResume(employeeId: string): Promise<void> {
  const today = todayDateUTC();

  const record = await prisma.timesheetDay.findUnique({
    where: {
      employeeId_date: {
        employeeId,
        date: today,
      },
    },
  });

  if (!record || !record.startTime || record.endTime) {
    throw new Error("Not currently clocked in");
  }

  const breaks = parseBreaks(record.breaks);
  const lastBreak = breaks.length > 0 ? breaks[breaks.length - 1] : null;

  if (!lastBreak || lastBreak.end) {
    throw new Error("Not currently on a break");
  }

  lastBreak.end = new Date().toISOString();

  const updated = await prisma.timesheetDay.update({
    where: { id: record.id },
    data: { breaks: JSON.stringify(breaks) },
  });

  await createAuditLog({
    entity: "TimesheetDay",
    entityId: record.id,
    action: "CLOCK_RESUME",
    actorId: employeeId,
    before: { breaks: record.breaks },
    after: { breaks: updated.breaks },
  });
}

/**
 * Clock-stop: end the work day. Auto-closes an open break if one exists.
 * Calculates and stores totalMinutes.
 */
export async function clockStop(employeeId: string): Promise<void> {
  const today = todayDateUTC();

  const record = await prisma.timesheetDay.findUnique({
    where: {
      employeeId_date: {
        employeeId,
        date: today,
      },
    },
  });

  if (!record || !record.startTime || record.endTime) {
    throw new Error("Not currently clocked in");
  }

  const now = new Date();
  const breaks = parseBreaks(record.breaks);

  // Auto-close open break
  const lastBreak = breaks.length > 0 ? breaks[breaks.length - 1] : null;
  if (lastBreak && !lastBreak.end) {
    lastBreak.end = now.toISOString();
  }

  // Calculate total working minutes
  const startMs = new Date(record.startTime).getTime();
  const endMs = now.getTime();
  const grossMinutes = (endMs - startMs) / 60_000;
  const breakMins = breaks.reduce((sum, b) => {
    const bStart = new Date(b.start).getTime();
    const bEnd = b.end ? new Date(b.end).getTime() : endMs;
    return sum + (bEnd - bStart) / 60_000;
  }, 0);
  const totalMinutes = Math.max(0, Math.round(grossMinutes - breakMins));

  const updated = await prisma.timesheetDay.update({
    where: { id: record.id },
    data: {
      endTime: now,
      breaks: JSON.stringify(breaks),
      totalMinutes,
    },
  });

  await createAuditLog({
    entity: "TimesheetDay",
    entityId: record.id,
    action: "CLOCK_OUT",
    actorId: employeeId,
    before: { endTime: null, totalMinutes: null },
    after: { endTime: updated.endTime?.toISOString(), totalMinutes: updated.totalMinutes, breaks: updated.breaks },
  });
}

// ---------------------------------------------------------------------------
// Calendar & Day Management
// ---------------------------------------------------------------------------

export interface CalendarDayData {
  id: string;
  date: string;
  status: string;
  dayType: string;
  totalMinutes: number | null;
  anomalies: string[];
}

/**
 * Get all timesheet days for an employee in a given month (calendar view).
 * Returns an array of objects with date, status, dayType, totalMinutes, anomalies.
 */
export async function getCalendarData(
  employeeId: string,
  year: number,
  month: number
): Promise<CalendarDayData[]> {
  // Build date range for the month (1-indexed month)
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1)); // first day of next month

  // Fetch employee to get hoursPerDay and schedule for anomaly detection
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { hoursPerDay: true, schedule: true },
  });

  const hoursPerDay = employee?.hoursPerDay ?? 8;
  const schedule = employee?.schedule ?? null;

  const records = await prisma.timesheetDay.findMany({
    where: {
      employeeId,
      date: {
        gte: startDate,
        lt: endDate,
      },
    },
    orderBy: { date: "asc" },
  });

  const now = new Date();
  const todayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  // Map existing records with anomaly detection
  const recordDates = new Set<string>();
  const result: CalendarDayData[] = records.map((record) => {
    const dateIso = record.date.toISOString();
    recordDates.add(dateIso.substring(0, 10));

    const anomalies = detectAnomalies(record, schedule, hoursPerDay);

    return {
      id: record.id,
      date: dateIso,
      status: record.status,
      dayType: record.dayType,
      totalMinutes: record.totalMinutes,
      anomalies,
    };
  });

  // Detect MISSING_DAY: weekdays (Mon-Fri) in the past with no record
  const cursor = new Date(startDate);
  while (cursor < endDate) {
    if (cursor < todayUTC) {
      const dayOfWeek = cursor.getUTCDay(); // 0=Sun, 6=Sat
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateKey = cursor.toISOString().substring(0, 10);
        if (!recordDates.has(dateKey)) {
          result.push({
            id: "",
            date: cursor.toISOString(),
            status: "DRAFT",
            dayType: "WORK",
            totalMinutes: null,
            anomalies: ["MISSING_DAY"],
          });
        }
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // Sort by date
  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

/**
 * Submit a single timesheet day for approval.
 * Validates that the day belongs to the employee, is in DRAFT status,
 * and has both startTime and endTime.
 */
export async function submitForApproval(
  employeeId: string,
  timesheetDayId: string
): Promise<void> {
  const record = await prisma.timesheetDay.findUnique({
    where: { id: timesheetDayId },
  });

  if (!record) {
    throw new Error("Timesheet day not found");
  }

  if (record.employeeId !== employeeId) {
    throw new Error("Forbidden");
  }

  if (record.status !== DAY_STATUS.DRAFT) {
    throw new Error("Only DRAFT entries can be submitted for approval");
  }

  if (!record.startTime || !record.endTime) {
    throw new Error(
      "Cannot submit: both start time and end time are required"
    );
  }

  await prisma.timesheetDay.update({
    where: { id: timesheetDayId },
    data: { status: DAY_STATUS.SUBMITTED },
  });

  await createAuditLog({
    entity: "TimesheetDay",
    entityId: timesheetDayId,
    action: "SUBMIT",
    actorId: employeeId,
    before: { status: "DRAFT" },
    after: { status: "SUBMITTED" },
  });
}

/**
 * Update a timesheet day's editable fields (startTime, endTime, breaks, note).
 * Only DRAFT or REJECTED entries can be edited.
 * If the entry was REJECTED, resets status back to DRAFT.
 * Recalculates totalMinutes if startTime or endTime changed.
 */
export async function updateTimesheetDay(
  employeeId: string,
  timesheetDayId: string,
  data: {
    startTime?: string;
    endTime?: string;
    breaks?: Break[];
    note?: string;
  }
): Promise<TodayTimesheet> {
  const record = await prisma.timesheetDay.findUnique({
    where: { id: timesheetDayId },
  });

  if (!record) {
    throw new Error("Timesheet day not found");
  }

  if (record.employeeId !== employeeId) {
    throw new Error("Forbidden");
  }

  if (
    record.status !== DAY_STATUS.DRAFT &&
    record.status !== DAY_STATUS.REJECTED
  ) {
    throw new Error("Only DRAFT or REJECTED entries can be edited");
  }

  // Build update payload
  const updateData: {
    startTime?: Date;
    endTime?: Date;
    breaks?: string;
    note?: string;
    totalMinutes?: number;
    status?: string;
  } = {};

  if (data.startTime !== undefined) {
    updateData.startTime = new Date(data.startTime);
  }

  if (data.endTime !== undefined) {
    updateData.endTime = new Date(data.endTime);
  }

  if (data.breaks !== undefined) {
    updateData.breaks = JSON.stringify(data.breaks);
  }

  if (data.note !== undefined) {
    updateData.note = data.note;
  }

  // If status was REJECTED, reset to DRAFT on edit
  if (record.status === DAY_STATUS.REJECTED) {
    updateData.status = DAY_STATUS.DRAFT;
  }

  // Recalculate totalMinutes if start or end time changed
  const effectiveStart = updateData.startTime ?? record.startTime;
  const effectiveEnd = updateData.endTime ?? record.endTime;
  const effectiveBreaksStr =
    updateData.breaks !== undefined ? updateData.breaks : record.breaks;

  if (
    effectiveStart &&
    effectiveEnd &&
    (data.startTime !== undefined || data.endTime !== undefined)
  ) {
    const startMs = new Date(effectiveStart).getTime();
    const endMs = new Date(effectiveEnd).getTime();
    const grossMinutes = (endMs - startMs) / 60_000;
    const breaks = parseBreaks(effectiveBreaksStr);
    const breakMins = breaks.reduce((sum, b) => {
      const bStart = new Date(b.start).getTime();
      const bEnd = b.end ? new Date(b.end).getTime() : endMs;
      return sum + (bEnd - bStart) / 60_000;
    }, 0);
    updateData.totalMinutes = Math.max(0, Math.round(grossMinutes - breakMins));
  }

  const updated = await prisma.timesheetDay.update({
    where: { id: timesheetDayId },
    data: updateData,
  });

  await createAuditLog({
    entity: "TimesheetDay",
    entityId: timesheetDayId,
    action: "UPDATE",
    actorId: employeeId,
    before: { startTime: record.startTime?.toISOString(), endTime: record.endTime?.toISOString(), breaks: record.breaks, note: record.note },
    after: { startTime: updated.startTime?.toISOString(), endTime: updated.endTime?.toISOString(), breaks: updated.breaks, note: updated.note, totalMinutes: updated.totalMinutes },
  });

  return toTodayTimesheet(updated);
}

/**
 * Fetch a single timesheet day by ID, including approval comments.
 * Verifies the day belongs to the employee.
 */
export async function getTimesheetDay(
  employeeId: string,
  timesheetDayId: string
): Promise<TodayTimesheet & { anomalies: string[]; approvals: { decision: string; comment: string | null; createdAt: string; approver: { firstName: string; lastName: string } }[] }> {
  const [record, employee] = await Promise.all([
    prisma.timesheetDay.findUnique({
      where: { id: timesheetDayId },
      include: {
        approvals: {
          orderBy: { createdAt: "desc" },
          include: {
            approver: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    }),
    prisma.employee.findUnique({
      where: { id: employeeId },
      select: { hoursPerDay: true, schedule: true },
    }),
  ]);

  if (!record) {
    throw new Error("Timesheet day not found");
  }

  if (record.employeeId !== employeeId) {
    throw new Error("Forbidden");
  }

  const base = toTodayTimesheet(record);
  const anomalies = detectAnomalies(record, employee?.schedule ?? null, employee?.hoursPerDay ?? 8);

  return {
    ...base,
    anomalies,
    approvals: record.approvals.map((a) => ({
      decision: a.decision,
      comment: a.comment,
      createdAt: a.createdAt.toISOString(),
      approver: {
        firstName: a.approver.firstName,
        lastName: a.approver.lastName,
      },
    })),
  };
}

/**
 * Create a manual timesheet entry for a past date when the employee forgot to clock in.
 */
export async function createManualTimesheetDay(
  userId: string,
  date: string,
  startTime: string,
  endTime: string,
  note?: string
) {
  // Validate employee exists
  const employee = await prisma.employee.findUnique({
    where: { id: userId },
  });
  if (!employee) {
    throw new Error("Employee not found");
  }

  // Parse the target date
  const [year, month, day] = date.split("-").map(Number);
  const targetDate = new Date(Date.UTC(year, month - 1, day));

  // Validate: date is in the past
  const now = new Date();
  const todayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  if (targetDate >= todayUTC) {
    throw new Error("Manual entries can only be created for past dates");
  }

  // Validate: date is a weekday
  const dayOfWeek = targetDate.getUTCDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    throw new Error("Manual entries cannot be created for weekends");
  }

  // Validate: no existing record for that date+employee
  const existing = await prisma.timesheetDay.findUnique({
    where: {
      employeeId_date: {
        employeeId: userId,
        date: targetDate,
      },
    },
  });
  if (existing) {
    throw new Error("A timesheet entry already exists for this date");
  }

  // Validate: month is not locked
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  const lockedCount = await prisma.timesheetDay.count({
    where: {
      employeeId: userId,
      date: { gte: monthStart, lt: monthEnd },
      status: DAY_STATUS.LOCKED,
    },
  });
  if (lockedCount > 0) {
    throw new Error("Cannot modify a locked month");
  }

  // Convert HH:mm to full ISO timestamps using the date
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  const startDateTime = new Date(targetDate);
  startDateTime.setUTCHours(startH, startM, 0, 0);

  const endDateTime = new Date(targetDate);
  endDateTime.setUTCHours(endH, endM, 0, 0);

  if (endDateTime <= startDateTime) {
    throw new Error("End time must be after start time");
  }

  // Calculate totalMinutes
  const totalMinutes = Math.max(
    0,
    Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60_000)
  );

  const created = await prisma.timesheetDay.create({
    data: {
      employeeId: userId,
      date: targetDate,
      startTime: startDateTime,
      endTime: endDateTime,
      status: DAY_STATUS.DRAFT,
      dayType: DAY_TYPE.WORK,
      breaks: "[]",
      totalMinutes,
      note: note ?? null,
    },
  });

  await createAuditLog({
    entity: "TimesheetDay",
    entityId: created.id,
    action: "CREATE",
    actorId: userId,
    after: { date, startTime, endTime, status: "DRAFT" },
  });

  return toTodayTimesheet(created);
}

// ---------------------------------------------------------------------------
// Leave / Absence Management
// ---------------------------------------------------------------------------

/**
 * Mark an employee's day as leave (CO or CM).
 * Only MANAGER or ADMIN can perform this action.
 * Managers can only mark leave for their direct reports.
 */
export async function markLeaveDay(
  actorId: string,
  actorRole: string,
  employeeId: string,
  date: Date,
  dayType: "CO" | "CM",
  note?: string
): Promise<void> {
  // Validate role
  if (actorRole !== ROLES.MANAGER && actorRole !== ROLES.ADMIN) {
    throw new Error("Forbidden");
  }

  // If MANAGER, verify employee's managerId === actorId
  if (actorRole === ROLES.MANAGER) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { managerId: true },
    });
    if (!employee) {
      throw new Error("Employee not found");
    }
    if (employee.managerId !== actorId) {
      throw new Error("Forbidden: employee is not your direct report");
    }
  }

  // Validate: date not in a LOCKED month
  const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));

  const lockedCount = await prisma.timesheetDay.count({
    where: {
      employeeId,
      date: { gte: monthStart, lt: monthEnd },
      status: DAY_STATUS.LOCKED,
    },
  });

  if (lockedCount > 0) {
    throw new Error("Cannot modify a locked month");
  }

  // Check existing record for that employeeId + date
  const existing = await prisma.timesheetDay.findUnique({
    where: {
      employeeId_date: { employeeId, date },
    },
  });

  if (existing) {
    // If exists with dayType WORK and startTime !== null, has clock data
    if (existing.dayType === DAY_TYPE.WORK && existing.startTime !== null) {
      throw new Error("Cannot mark leave on a day with clock data");
    }
    // If exists with dayType CO or CM, already leave
    if (existing.dayType === DAY_TYPE.CO || existing.dayType === DAY_TYPE.CM) {
      throw new Error("Day is already marked as leave");
    }
    // If exists with dayType WORK and startTime === null, upsert (update)
    const updated = await prisma.timesheetDay.update({
      where: { id: existing.id },
      data: {
        dayType,
        status: DAY_STATUS.APPROVED,
        startTime: null,
        endTime: null,
        breaks: "[]",
        totalMinutes: null,
        note: note ?? null,
      },
    });

    await prisma.approval.create({
      data: {
        timesheetDayId: updated.id,
        approverId: actorId,
        decision: "APPROVED",
      },
    });

    await createAuditLog({
      entity: "TimesheetDay",
      entityId: updated.id,
      action: "CREATE",
      actorId,
      after: { dayType, date: date.toISOString() },
    });

    return;
  }

  // Not exists, create new
  const created = await prisma.timesheetDay.create({
    data: {
      employeeId,
      date,
      dayType,
      status: DAY_STATUS.APPROVED,
      startTime: null,
      endTime: null,
      breaks: "[]",
      totalMinutes: null,
      note: note ?? null,
    },
  });

  await prisma.approval.create({
    data: {
      timesheetDayId: created.id,
      approverId: actorId,
      decision: "APPROVED",
    },
  });

  await createAuditLog({
    entity: "TimesheetDay",
    entityId: created.id,
    action: "CREATE",
    actorId,
    after: { dayType, date: date.toISOString() },
  });
}

/**
 * Remove a leave day (CO or CM). Deletes the TimesheetDay and associated approvals.
 * Only MANAGER or ADMIN can perform this action.
 * Managers can only remove leave for their direct reports.
 */
export async function removeLeaveDay(
  actorId: string,
  actorRole: string,
  timesheetDayId: string
): Promise<void> {
  // Validate role
  if (actorRole !== ROLES.MANAGER && actorRole !== ROLES.ADMIN) {
    throw new Error("Forbidden");
  }

  const record = await prisma.timesheetDay.findUnique({
    where: { id: timesheetDayId },
  });

  if (!record) {
    throw new Error("Timesheet day not found");
  }

  // Validate: dayType is CO or CM
  if (record.dayType !== DAY_TYPE.CO && record.dayType !== DAY_TYPE.CM) {
    throw new Error("Only leave days (CO/CM) can be removed");
  }

  // Validate: status is not LOCKED
  if (record.status === DAY_STATUS.LOCKED) {
    throw new Error("Cannot remove a locked day");
  }

  // If MANAGER, verify employee's managerId === actorId
  if (actorRole === ROLES.MANAGER) {
    const employee = await prisma.employee.findUnique({
      where: { id: record.employeeId },
      select: { managerId: true },
    });
    if (!employee || employee.managerId !== actorId) {
      throw new Error("Forbidden: employee is not your direct report");
    }
  }

  // Delete associated Approval records first, then delete the TimesheetDay
  await prisma.approval.deleteMany({
    where: { timesheetDayId },
  });

  await prisma.timesheetDay.delete({
    where: { id: timesheetDayId },
  });

  // Create AuditLog
  await createAuditLog({
    entity: "TimesheetDay",
    entityId: timesheetDayId,
    action: "DELETE",
    actorId,
    before: {
      dayType: record.dayType,
      date: record.date.toISOString(),
      employeeId: record.employeeId,
    },
  });
}

// ---------------------------------------------------------------------------
// Employee Alerts (Dashboard Notification Banner)
// ---------------------------------------------------------------------------

/**
 * Compute alerts for an employee's dashboard:
 * - MISSING_YESTERDAY: no record for yesterday (weekday, non-leave)
 * - REJECTED_DAYS: rejected days in current month that need correction
 * - OPEN_DAY: a past day with startTime but no endTime
 */
export async function getEmployeeAlerts(
  employeeId: string
): Promise<EmployeeAlert[]> {
  const alerts: EmployeeAlert[] = [];
  const now = new Date();

  const todayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  // 1. Check yesterday (if weekday) has no record
  const yesterday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)
  );
  const yesterdayDay = yesterday.getUTCDay(); // 0=Sun, 6=Sat

  if (yesterdayDay >= 1 && yesterdayDay <= 5) {
    const yesterdayRecord = await prisma.timesheetDay.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: yesterday,
        },
      },
    });

    // If no record at all, or if record exists but is not a leave day
    if (!yesterdayRecord) {
      alerts.push({
        type: "MISSING_YESTERDAY",
        message: "Pontaj lipsa pentru ziua de ieri",
        severity: "critical",
      });
    } else if (
      yesterdayRecord.dayType !== DAY_TYPE.CO &&
      yesterdayRecord.dayType !== DAY_TYPE.CM &&
      yesterdayRecord.dayType !== DAY_TYPE.HOLIDAY &&
      !yesterdayRecord.startTime
    ) {
      // Record exists as WORK but no startTime, also missing
      alerts.push({
        type: "MISSING_YESTERDAY",
        message: "Pontaj lipsa pentru ziua de ieri",
        severity: "critical",
      });
    }
  }

  // 2. Check for REJECTED days in current month
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const monthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );

  const rejectedCount = await prisma.timesheetDay.count({
    where: {
      employeeId,
      status: DAY_STATUS.REJECTED,
      date: {
        gte: monthStart,
        lt: monthEnd,
      },
    },
  });

  if (rejectedCount > 0) {
    alerts.push({
      type: "REJECTED_DAYS",
      message: `Ai ${rejectedCount} zi(le) respinse care necesita corectie`,
      severity: "critical",
      count: rejectedCount,
    });
  }

  // 3. Check for open day (startTime set, no endTime, from a PAST date, not today)
  const openDay = await prisma.timesheetDay.findFirst({
    where: {
      employeeId,
      startTime: { not: null },
      endTime: null,
      date: { lt: todayUTC },
      dayType: DAY_TYPE.WORK,
    },
  });

  if (openDay) {
    alerts.push({
      type: "OPEN_DAY",
      message: "Ai o zi deschisa fara Stop",
      severity: "warning",
    });
  }

  return alerts;
}
