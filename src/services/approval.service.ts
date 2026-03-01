import { prisma } from "@/lib/prisma";
import {
  CLOCK_STATES,
  DAY_STATUS,
  DAY_TYPE,
  APPROVAL_DECISIONS,
  ROLES,
  type ClockState,
} from "@/lib/constants";
import type { TeamMember } from "@/types/employee";
import type { ApprovalItem } from "@/types/api";
import { createAuditLog } from "@/services/audit.service";

// ---------------------------------------------------------------------------
// Helpers (reusing patterns from timesheet.service.ts)
// ---------------------------------------------------------------------------

interface Break {
  start: string;
  end?: string;
}

/** Returns today at midnight UTC. */
function todayDateUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

/** Safely parse the JSON breaks column. */
function parseBreaks(raw: string | null | undefined): Break[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Break[]) : [];
  } catch {
    return [];
  }
}

/** Derive the clock state from a TimesheetDay record. */
function deriveClockState(
  record: {
    startTime: Date | null;
    endTime: Date | null;
    breaks: string;
  } | null
): ClockState {
  if (!record || !record.startTime) return CLOCK_STATES.NOT_CLOCKED;
  if (record.endTime) return CLOCK_STATES.STOPPED;

  const breaks = parseBreaks(record.breaks);
  const lastBreak = breaks.length > 0 ? breaks[breaks.length - 1] : null;

  if (lastBreak && !lastBreak.end) return CLOCK_STATES.ON_BREAK;
  return CLOCK_STATES.WORKING;
}

/** Compute elapsed working minutes (excluding breaks). */
function computeElapsedMinutes(
  record: {
    startTime: Date | null;
    endTime: Date | null;
    breaks: string;
    totalMinutes: number | null;
  } | null
): number {
  if (!record || !record.startTime) return 0;

  if (record.endTime && record.totalMinutes !== null) {
    return record.totalMinutes;
  }

  const now = new Date();
  const start = new Date(record.startTime).getTime();
  const end = record.endTime
    ? new Date(record.endTime).getTime()
    : now.getTime();

  const grossMinutes = (end - start) / 60_000;
  const breaks = parseBreaks(record.breaks);
  const breakMins = breaks.reduce((sum, b) => {
    const bStart = new Date(b.start).getTime();
    const bEnd = b.end ? new Date(b.end).getTime() : now.getTime();
    return sum + (bEnd - bStart) / 60_000;
  }, 0);

  return Math.max(0, Math.round(grossMinutes - breakMins));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get team members visible to the authenticated user.
 * - ADMIN: sees ALL employees (global visibility)
 * - MANAGER: sees only their direct reports (managerId filter)
 */
export async function getTeamMembers(
  userId: string,
  role: string
): Promise<TeamMember[]> {
  const isAdmin = role === ROLES.ADMIN;

  const employees = await prisma.employee.findMany({
    where: isAdmin ? { id: { not: userId } } : { managerId: userId },
    include: {
      manager: {
        select: { id: true, firstName: true, lastName: true },
      },
      schedule: {
        select: { id: true, name: true },
      },
    },
    orderBy: { lastName: "asc" },
  });

  const today = todayDateUTC();
  const now = new Date();

  // Fetch today's timesheet for all team members in a single query
  const employeeIds = employees.map((e) => e.id);
  const todayTimesheets = await prisma.timesheetDay.findMany({
    where: {
      employeeId: { in: employeeIds },
      date: today,
    },
  });

  const timesheetByEmployee = new Map<string, (typeof todayTimesheets)[number]>(
    todayTimesheets.map((t) => [t.employeeId, t])
  );

  // Fetch ALL timesheet records for the current month for anomaly detection
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const monthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );

  const monthTimesheets = await prisma.timesheetDay.findMany({
    where: {
      employeeId: { in: employeeIds },
      date: { gte: monthStart, lt: monthEnd },
    },
  });

  // Group monthly timesheets by employee
  const monthByEmployee = new Map<string, (typeof monthTimesheets)>();
  for (const ts of monthTimesheets) {
    const existing = monthByEmployee.get(ts.employeeId);
    if (existing) {
      existing.push(ts);
    } else {
      monthByEmployee.set(ts.employeeId, [ts]);
    }
  }

  return employees.map((emp) => {
    const todayRecord = timesheetByEmployee.get(emp.id) ?? null;
    const clockState = deriveClockState(todayRecord);
    const elapsedMinutes = computeElapsedMinutes(todayRecord);
    const hoursToday =
      elapsedMinutes > 0
        ? Math.round((elapsedMinutes / 60) * 100) / 100
        : null;

    // Compute anomalyCount for this employee
    const empRecords = monthByEmployee.get(emp.id) ?? [];
    const minExpectedMinutes = emp.hoursPerDay * 60 * 0.875;
    let anomalyCount = 0;

    // Build set of dates that have records (for MISSING_DAY detection)
    const recordDates = new Set<string>();

    for (const rec of empRecords) {
      recordDates.add(rec.date.toISOString().substring(0, 10));

      const isPastDay = rec.date.getTime() < today.getTime();

      // MISSING_END: startTime set, no endTime, past day
      if (isPastDay && rec.startTime && !rec.endTime) {
        anomalyCount++;
      }

      // UNDER_HOURS: completed work day below threshold
      if (
        rec.dayType === DAY_TYPE.WORK &&
        rec.endTime &&
        rec.totalMinutes !== null &&
        rec.totalMinutes < minExpectedMinutes
      ) {
        anomalyCount++;
      }

      // OVER_HOURS: completed work day over 10 hours
      if (
        rec.dayType === DAY_TYPE.WORK &&
        rec.endTime &&
        rec.totalMinutes !== null &&
        rec.totalMinutes > 600
      ) {
        anomalyCount++;
      }
    }

    // MISSING_DAY: weekdays (Mon-Fri) before today with no record
    const cursor = new Date(monthStart);
    while (cursor < today && cursor < monthEnd) {
      const dayOfWeek = cursor.getUTCDay(); // 0=Sun, 6=Sat
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateKey = cursor.toISOString().substring(0, 10);
        if (!recordDates.has(dateKey)) {
          anomalyCount++;
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return {
      id: emp.id,
      email: emp.email,
      firstName: emp.firstName,
      lastName: emp.lastName,
      role: emp.role as TeamMember["role"],
      department: emp.department,
      status: emp.status as TeamMember["status"],
      hoursPerDay: emp.hoursPerDay,
      managerId: emp.managerId,
      scheduleId: emp.scheduleId,
      manager: emp.manager ?? null,
      schedule: emp.schedule ?? null,
      createdAt: emp.createdAt.toISOString(),
      currentStatus: clockState,
      hoursToday,
      anomalyCount,
    };
  });
}

/**
 * Get pending approval items visible to the authenticated user.
 * - ADMIN: sees ALL SUBMITTED timesheets (global visibility)
 * - MANAGER: sees only SUBMITTED timesheets from their direct reports
 */
export async function getPendingApprovals(
  userId: string,
  role: string
): Promise<ApprovalItem[]> {
  const isAdmin = role === ROLES.ADMIN;

  const submissions = await prisma.timesheetDay.findMany({
    where: isAdmin
      ? { status: DAY_STATUS.SUBMITTED }
      : { status: DAY_STATUS.SUBMITTED, employee: { managerId: userId } },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          department: true,
          manager: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
    orderBy: { date: "asc" },
  });

  return submissions.map((day) => ({
    id: day.id,
    timesheetDayId: day.id,
    timesheetDay: {
      id: day.id,
      date: day.date.toISOString(),
      startTime: day.startTime?.toISOString() ?? null,
      endTime: day.endTime?.toISOString() ?? null,
      breaks: day.breaks,
      totalMinutes: day.totalMinutes,
      status: day.status,
      employee: {
        id: day.employee.id,
        firstName: day.employee.firstName,
        lastName: day.employee.lastName,
        email: day.employee.email,
        department: day.employee.department,
        manager: day.employee.manager ?? null,
      },
    },
    createdAt: day.createdAt.toISOString(),
  }));
}

/**
 * Process an approval decision for a submitted timesheet day.
 * - ADMIN: can approve/reject any submission (global authority)
 * - MANAGER: can only approve/reject their direct reports
 * If REJECTED, comment is required.
 */
export async function processApproval(
  approverId: string,
  approverRole: string,
  timesheetDayId: string,
  decision: "APPROVED" | "REJECTED",
  comment?: string
): Promise<{ approval: { id: string; decision: string }; timesheetDay: { id: string; status: string } }> {
  const isAdmin = approverRole === ROLES.ADMIN;

  // Fetch the timesheet day with employee info
  const timesheetDay = await prisma.timesheetDay.findUnique({
    where: { id: timesheetDayId },
    include: {
      employee: {
        select: { id: true, managerId: true },
      },
    },
  });

  if (!timesheetDay) {
    throw new Error("Timesheet day not found");
  }

  if (timesheetDay.status !== DAY_STATUS.SUBMITTED) {
    throw new Error("Only SUBMITTED entries can be approved or rejected");
  }

  // Validate authorization: admin has global authority, manager only their team
  if (!isAdmin && timesheetDay.employee.managerId !== approverId) {
    throw new Error("Forbidden");
  }

  // If REJECTED, comment is required
  if (decision === APPROVAL_DECISIONS.REJECTED && (!comment || comment.trim().length === 0)) {
    throw new Error("A comment is required when rejecting a timesheet");
  }

  // Determine the new status
  const newStatus =
    decision === APPROVAL_DECISIONS.APPROVED
      ? DAY_STATUS.APPROVED
      : DAY_STATUS.REJECTED;

  // Create Approval record and update TimesheetDay status in a transaction
  const [approval, updatedDay] = await prisma.$transaction([
    prisma.approval.create({
      data: {
        timesheetDayId,
        approverId,
        decision,
        comment: comment?.trim() || null,
      },
    }),
    prisma.timesheetDay.update({
      where: { id: timesheetDayId },
      data: { status: newStatus },
    }),
  ]);

  await createAuditLog({
    entity: "TimesheetDay",
    entityId: timesheetDayId,
    action: decision === "APPROVED" ? "APPROVE" : "REJECT",
    actorId: approverId,
    before: { status: "SUBMITTED" },
    after: { status: decision === "APPROVED" ? "APPROVED" : "REJECTED", decision, comment: comment || null },
  });

  return {
    approval: {
      id: approval.id,
      decision: approval.decision,
    },
    timesheetDay: {
      id: updatedDay.id,
      status: updatedDay.status,
    },
  };
}
