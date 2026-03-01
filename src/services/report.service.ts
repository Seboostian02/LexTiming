import { prisma } from "@/lib/prisma";
import type { MonthReportRow } from "@/types/api";
import { createAuditLog } from "@/services/audit.service";

// Month Close Validation Types

export interface CloseBlockerItem {
  employeeName: string;
  employeeId: string;
  count: number;
}

export interface CloseValidation {
  canClose: boolean;
  approvedCount: number;
  lockedCount: number;
  blockers: {
    draftDays: CloseBlockerItem[];
    submittedDays: CloseBlockerItem[];
    missingEndDays: CloseBlockerItem[];
    missingDays: CloseBlockerItem[];
  };
  totalBlockers: number;
}



export async function getMonthlyReport(
  year: number,
  month: number
): Promise<MonthReportRow[]> {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  // Get all active employees
  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
      hoursPerDay: true,
    },
    orderBy: { lastName: "asc" },
  });

  // Get all timesheet days for the month across all employees
  const timesheetDays = await prisma.timesheetDay.findMany({
    where: {
      date: {
        gte: startDate,
        lt: endDate,
      },
    },
  });

  // Group timesheet days by employeeId
  const daysByEmployee = new Map<
    string,
    typeof timesheetDays
  >();
  for (const day of timesheetDays) {
    const existing = daysByEmployee.get(day.employeeId) ?? [];
    existing.push(day);
    daysByEmployee.set(day.employeeId, existing);
  }

  const report: MonthReportRow[] = employees.map((employee) => {
    const days = daysByEmployee.get(employee.id) ?? [];

    // Work days (type WORK with totalMinutes > 0)
    const workDays = days.filter(
      (d) => d.dayType === "WORK" && d.totalMinutes !== null && d.totalMinutes > 0
    );

    const totalDaysWorked = workDays.length;
    const totalMinutes = workDays.reduce(
      (sum, d) => sum + (d.totalMinutes ?? 0),
      0
    );
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    const avgHoursPerDay =
      totalDaysWorked > 0
        ? Math.round((totalHours / totalDaysWorked) * 100) / 100
        : 0;

    // Overtime: sum of extra hours above hoursPerDay for each work day
    const overtimeMinutes = workDays.reduce((sum, d) => {
      const dayMinutes = d.totalMinutes ?? 0;
      const expectedMinutes = employee.hoursPerDay * 60;
      const overtime = dayMinutes - expectedMinutes;
      return sum + Math.max(0, overtime);
    }, 0);
    const overtimeHours = Math.round((overtimeMinutes / 60) * 100) / 100;

    // Leave days (CO or CM)
    const leaveDays = days.filter(
      (d) => d.dayType === "CO" || d.dayType === "CM"
    ).length;

    // Absent days: workdays without any entry (not a weekend, not a holiday, no timesheet)
    const daysWithEntries = new Set(
      days.map((d) => d.date.toISOString().substring(0, 10))
    );
    let absentDays = 0;
    const current = new Date(startDate);
    const today = new Date();
    const todayStr = today.toISOString().substring(0, 10);
    while (current < endDate) {
      const dayOfWeek = current.getUTCDay();
      const dateStr = current.toISOString().substring(0, 10);
      // Only count past workdays (not weekends, not future)
      if (
        dayOfWeek !== 0 &&
        dayOfWeek !== 6 &&
        dateStr <= todayStr &&
        !daysWithEntries.has(dateStr)
      ) {
        absentDays++;
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return {
      employeeId: employee.id,
      employeeName: `${employee.lastName} ${employee.firstName}`,
      department: employee.department,
      totalDaysWorked,
      totalHours,
      avgHoursPerDay,
      overtimeHours,
      absentDays,
      leaveDays,
    };
  });

  return report;
}

// Month Close Pre-Validation

/**
 * Return all weekday (Mon-Fri) dates in the given month up to (but not
 * including) today. Future dates and the current day are ignored because the
 * employee hasn't had a chance to clock in yet.
 */
function pastWeekdaysInMonth(year: number, month: number): Date[] {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1)); // first of next month
  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);

  const dates: Date[] = [];
  const current = new Date(start);
  while (current < end) {
    const dow = current.getUTCDay();
    const dateStr = current.toISOString().substring(0, 10);
    if (dow !== 0 && dow !== 6 && dateStr < todayStr) {
      dates.push(new Date(current));
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export async function getMonthCloseValidation(
  year: number,
  month: number
): Promise<CloseValidation> {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  // 1. Fetch all TimesheetDay records for the month with employee info
  const timesheetDays = await prisma.timesheetDay.findMany({
    where: {
      date: { gte: startDate, lt: endDate },
    },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  // 2. Fetch all active employees
  const activeEmployees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true },
  });

  // 3. Aggregate counts by status
  let approvedCount = 0;
  let lockedCount = 0;

  // Blocker accumulators: employeeId -> { name, count }
  const draftMap = new Map<string, { name: string; count: number }>();
  const submittedMap = new Map<string, { name: string; count: number }>();
  const missingEndMap = new Map<string, { name: string; count: number }>();

  for (const day of timesheetDays) {
    const empName = `${day.employee.lastName} ${day.employee.firstName}`;
    const empId = day.employeeId;

    if (day.status === "APPROVED") {
      approvedCount++;
    } else if (day.status === "LOCKED") {
      lockedCount++;
    } else if (day.status === "DRAFT") {
      const entry = draftMap.get(empId) ?? { name: empName, count: 0 };
      entry.count++;
      draftMap.set(empId, entry);
    } else if (day.status === "SUBMITTED") {
      const entry = submittedMap.get(empId) ?? { name: empName, count: 0 };
      entry.count++;
      submittedMap.set(empId, entry);
    }

    // Missing end time on a WORK day that was started
    if (
      day.dayType === "WORK" &&
      day.startTime !== null &&
      day.endTime === null
    ) {
      const entry = missingEndMap.get(empId) ?? { name: empName, count: 0 };
      entry.count++;
      missingEndMap.set(empId, entry);
    }
  }

  // 4. Missing days: past weekdays without any record for each active employee
  const weekdays = pastWeekdaysInMonth(year, month);
  const recordDates = new Map<string, Set<string>>(); // employeeId -> set of date strings
  for (const day of timesheetDays) {
    const dateStr = day.date.toISOString().substring(0, 10);
    const existing = recordDates.get(day.employeeId) ?? new Set<string>();
    existing.add(dateStr);
    recordDates.set(day.employeeId, existing);
  }

  const missingDaysMap = new Map<string, { name: string; count: number }>();
  for (const emp of activeEmployees) {
    const empDates = recordDates.get(emp.id) ?? new Set<string>();
    let missing = 0;
    for (const wd of weekdays) {
      const dateStr = wd.toISOString().substring(0, 10);
      if (!empDates.has(dateStr)) {
        missing++;
      }
    }
    if (missing > 0) {
      missingDaysMap.set(emp.id, {
        name: `${emp.lastName} ${emp.firstName}`,
        count: missing,
      });
    }
  }

  // 5. Convert maps to arrays
  const toBlockerList = (
    map: Map<string, { name: string; count: number }>
  ): CloseBlockerItem[] =>
    Array.from(map.entries()).map(([employeeId, { name, count }]) => ({
      employeeName: name,
      employeeId,
      count,
    }));

  const blockers = {
    draftDays: toBlockerList(draftMap),
    submittedDays: toBlockerList(submittedMap),
    missingEndDays: toBlockerList(missingEndMap),
    missingDays: toBlockerList(missingDaysMap),
  };

  const totalBlockers =
    blockers.draftDays.reduce((s, b) => s + b.count, 0) +
    blockers.submittedDays.reduce((s, b) => s + b.count, 0) +
    blockers.missingEndDays.reduce((s, b) => s + b.count, 0) +
    blockers.missingDays.reduce((s, b) => s + b.count, 0);

  return {
    canClose: totalBlockers === 0,
    approvedCount,
    lockedCount,
    blockers,
    totalBlockers,
  };
}

// Close Month

export async function closeMonth(
  year: number,
  month: number,
  force: boolean | undefined,
  actorId: string
): Promise<number> {
  if (!force) {
    const validation = await getMonthCloseValidation(year, month);
    if (!validation.canClose) {
      throw new Error(
        `Cannot close month: ${validation.totalBlockers} blocker(s) remaining. Use force to override.`
      );
    }
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  const result = await prisma.timesheetDay.updateMany({
    where: {
      date: {
        gte: startDate,
        lt: endDate,
      },
      status: "APPROVED",
    },
    data: {
      status: "LOCKED",
    },
  });

  await createAuditLog({
    entity: "TimesheetDay",
    entityId: `month-${year}-${String(month).padStart(2, "0")}`,
    action: "LOCK",
    actorId,
    after: { status: "LOCKED", count: result.count, month: `${year}-${String(month).padStart(2, "0")}` },
  });

  return result.count;
}
