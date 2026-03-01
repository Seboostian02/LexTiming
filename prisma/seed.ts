import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helpers

function utcDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

function utcTime(y: number, m: number, d: number, h: number, min: number): Date {
  return new Date(Date.UTC(y, m - 1, d, h, min, 0, 0));
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** All Mon-Fri dates in a given month (1-indexed) */
function weekdays(y: number, m: number): Date[] {
  const result: Date[] = [];
  const cursor = utcDate(y, m, 1);
  while (cursor.getUTCMonth() === m - 1) {
    const dow = cursor.getUTCDay();
    if (dow >= 1 && dow <= 5) result.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

/** Build a standard workday record (no Prisma call, just data) */
function buildWorkDay(
  empId: string,
  date: Date,
  status: string,
  opts?: {
    startH?: number; startM?: number;
    endH?: number; endM?: number;
    totalMinutes?: number;
    noEnd?: boolean;
    note?: string;
  }
) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();

  const sh = opts?.startH ?? 9;
  const sm = opts?.startM ?? randInt(0, 15);
  const eh = opts?.endH ?? 17;
  const em = opts?.endM ?? randInt(0, 30);

  const startTime = utcTime(y, m, d, sh, sm);
  const endTime = opts?.noEnd ? null : utcTime(y, m, d, eh, em);

  let breaks = "[]";
  let totalMinutes: number | null = null;

  if (endTime) {
    const bStart = utcTime(y, m, d, 12, randInt(0, 30));
    const bEnd = new Date(bStart.getTime() + 30 * 60_000);
    breaks = JSON.stringify([{ start: bStart.toISOString(), end: bEnd.toISOString() }]);
    totalMinutes = opts?.totalMinutes ??
      Math.round((endTime.getTime() - startTime.getTime()) / 60_000 - 30);
  }

  return {
    employeeId: empId,
    date,
    startTime,
    endTime,
    breaks,
    totalMinutes,
    status,
    dayType: "WORK",
    note: opts?.note ?? undefined,
  };
}

// Main

async function main() {
  const force = process.argv.includes("--force");

  // Conditional seeding: skip if data already exists (unless --force)
  const existingCount = await prisma.employee.count();
  if (existingCount > 0 && !force) {
    console.log("Database already seeded (%d employees). Skipping.", existingCount);
    console.log("Run with --force to wipe and re-seed.");
    return;
  }

  console.log("Cleaning database...");
  await prisma.auditLog.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.timesheetDay.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.schedule.deleteMany();

  // Schedules
  const fixSchedule = await prisma.schedule.create({
    data: {
      id: "schedule-fix",
      name: "Fix 9-17",
      type: "FIX",
      startTime: "09:00",
      endTime: "17:00",
      earlyStartMinutes: 30,
      lateEndMinutes: 30,
      minHoursPerDay: 8,
      breakMinutes: 30,
    },
  });

  const windowSchedule = await prisma.schedule.create({
    data: {
      id: "schedule-fereastra",
      name: "Fereastra 8-10 -> 16-18",
      type: "FEREASTRA",
      startTime: "08:00",
      endTime: "18:00",
      startWindowEnd: "10:00",
      endWindowStart: "16:00",
      earlyStartMinutes: 0,
      lateEndMinutes: 0,
      minHoursPerDay: 8,
      breakMinutes: 30,
    },
  });

  const flexSchedule = await prisma.schedule.create({
    data: {
      id: "schedule-flex",
      name: "Flexibil (min 6h)",
      type: "FLEX",
      startTime: "07:00",
      endTime: "21:00",
      earlyStartMinutes: 0,
      lateEndMinutes: 0,
      minHoursPerDay: 6,
      breakMinutes: 30,
    },
  });

  // Passwords
  const [adminHash, managerHash, employeeHash] = await Promise.all([
    bcrypt.hash("admin123", 12),
    bcrypt.hash("manager123", 12),
    bcrypt.hash("employee123", 12),
  ]);

  // Employees
  const admin = await prisma.employee.create({
    data: {
      id: "user-admin",
      email: "admin@lextiming.com",
      passwordHash: adminHash,
      firstName: "Admin",
      lastName: "System",
      role: "ADMIN",
      department: "IT",
      hoursPerDay: 8,
      scheduleId: fixSchedule.id,
    },
  });

  const maria = await prisma.employee.create({
    data: {
      id: "user-manager-maria",
      email: "maria@lextiming.com",
      passwordHash: managerHash,
      firstName: "Maria",
      lastName: "Popescu",
      role: "MANAGER",
      department: "HR",
      hoursPerDay: 8,
      scheduleId: fixSchedule.id,
    },
  });

  const andrei = await prisma.employee.create({
    data: {
      id: "user-manager-andrei",
      email: "andrei@lextiming.com",
      passwordHash: managerHash,
      firstName: "Andrei",
      lastName: "Ionescu",
      role: "MANAGER",
      department: "Engineering",
      hoursPerDay: 8,
      scheduleId: windowSchedule.id,
    },
  });

  // HR employees (under Maria)
  const ion = await prisma.employee.create({
    data: {
      id: "user-emp-ion",
      email: "ion@lextiming.com",
      passwordHash: employeeHash,
      firstName: "Ion",
      lastName: "Vasilescu",
      role: "EMPLOYEE",
      department: "HR",
      hoursPerDay: 8,
      managerId: maria.id,
      scheduleId: fixSchedule.id,
    },
  });

  const elena = await prisma.employee.create({
    data: {
      id: "user-emp-elena",
      email: "elena@lextiming.com",
      passwordHash: employeeHash,
      firstName: "Elena",
      lastName: "Dumitrescu",
      role: "EMPLOYEE",
      department: "HR",
      hoursPerDay: 8,
      managerId: maria.id,
      scheduleId: fixSchedule.id,
    },
  });

  const george = await prisma.employee.create({
    data: {
      id: "user-emp-george",
      email: "george@lextiming.com",
      passwordHash: employeeHash,
      firstName: "George",
      lastName: "Marin",
      role: "EMPLOYEE",
      department: "HR",
      hoursPerDay: 8,
      managerId: maria.id,
      scheduleId: fixSchedule.id,
    },
  });

  // Engineering employees (under Andrei)
  const ana = await prisma.employee.create({
    data: {
      id: "user-emp-ana",
      email: "ana@lextiming.com",
      passwordHash: employeeHash,
      firstName: "Ana",
      lastName: "Stanescu",
      role: "EMPLOYEE",
      department: "Engineering",
      hoursPerDay: 8,
      managerId: andrei.id,
      scheduleId: windowSchedule.id,
    },
  });

  const mihai = await prisma.employee.create({
    data: {
      id: "user-emp-mihai",
      email: "mihai@lextiming.com",
      passwordHash: employeeHash,
      firstName: "Mihai",
      lastName: "Georgescu",
      role: "EMPLOYEE",
      department: "Engineering",
      hoursPerDay: 8,
      managerId: andrei.id,
      scheduleId: windowSchedule.id,
    },
  });

  const diana = await prisma.employee.create({
    data: {
      id: "user-emp-diana",
      email: "diana@lextiming.com",
      passwordHash: employeeHash,
      firstName: "Diana",
      lastName: "Popa",
      role: "EMPLOYEE",
      department: "Engineering",
      hoursPerDay: 8,
      managerId: andrei.id,
      scheduleId: flexSchedule.id,
    },
  });

  const everyone = [ion, elena, george, ana, mihai, diana, maria, andrei];

  // Romanian public holidays in Jan 2026
  const holidays = new Set(["2026-01-01", "2026-01-02", "2026-01-24"]);

  function dk(d: Date) {
    return d.toISOString().substring(0, 10);
  }

  // JANUARY 2026 - Fully finalized & LOCKED
  console.log("Seeding January 2026 (LOCKED)...");

  const janDays = weekdays(2026, 1);
  const janRecords: { id: string; employeeId: string; date: Date; startTime: Date | null; endTime: Date | null; breaks: string; totalMinutes: number | null; status: string; dayType: string }[] = [];

  for (const emp of everyone) {
    for (const date of janDays) {
      const key = dk(date);
      const day = date.getUTCDate();

      // Public holidays, LOCKED with HOLIDAY dayType, no approval needed
      if (holidays.has(key)) {
        const ts = await prisma.timesheetDay.create({
          data: { employeeId: emp.id, date, status: "LOCKED", dayType: "HOLIDAY" },
        });
        janRecords.push({ id: ts.id, employeeId: ts.employeeId, date: ts.date, startTime: ts.startTime, endTime: ts.endTime, breaks: ts.breaks ?? "[]", totalMinutes: ts.totalMinutes, status: ts.status, dayType: ts.dayType });
        continue;
      }

      // Elena: Concediu Odihna on Jan 15-16
      if (emp.id === elena.id && (day === 15 || day === 16)) {
        const ts = await prisma.timesheetDay.create({
          data: { employeeId: emp.id, date, status: "LOCKED", dayType: "CO" },
        });
        janRecords.push({ id: ts.id, employeeId: ts.employeeId, date: ts.date, startTime: ts.startTime, endTime: ts.endTime, breaks: ts.breaks ?? "[]", totalMinutes: ts.totalMinutes, status: ts.status, dayType: ts.dayType });
        await prisma.approval.create({
          data: { timesheetDayId: ts.id, approverId: maria.id, decision: "APPROVED" },
        });
        continue;
      }

      // George: Concediu Medical on Jan 22
      if (emp.id === george.id && day === 22) {
        const ts = await prisma.timesheetDay.create({
          data: { employeeId: emp.id, date, status: "LOCKED", dayType: "CM" },
        });
        janRecords.push({ id: ts.id, employeeId: ts.employeeId, date: ts.date, startTime: ts.startTime, endTime: ts.endTime, breaks: ts.breaks ?? "[]", totalMinutes: ts.totalMinutes, status: ts.status, dayType: ts.dayType });
        await prisma.approval.create({
          data: { timesheetDayId: ts.id, approverId: maria.id, decision: "APPROVED" },
        });
        continue;
      }

      // Normal workday, LOCKED with approval
      const ts = await prisma.timesheetDay.create({
        data: buildWorkDay(emp.id, date, "LOCKED"),
      });
      janRecords.push({ id: ts.id, employeeId: ts.employeeId, date: ts.date, startTime: ts.startTime, endTime: ts.endTime, breaks: ts.breaks ?? "[]", totalMinutes: ts.totalMinutes, status: ts.status, dayType: ts.dayType });
      const approverId = emp.managerId ?? admin.id;
      await prisma.approval.create({
        data: { timesheetDayId: ts.id, approverId, decision: "APPROVED" },
      });
    }
  }

  // FEBRUARY 2026 - Open month, mixed statuses & anomalies
  //
  //  Weeks 1-2 (Feb 2-13):  mostly APPROVED
  //  Week 3   (Feb 16-20): SUBMITTED
  //  Week 4   (Feb 23-27): DRAFT
  //
  //  Special cases per employee:
  //    Ion:    REJECTED on 18, missing 26-27 (MISSING_DAY)
  //    Elena:  CO leave on 12-13
  //    George: UNDER_HOURS on 17 (5.5h < 7h threshold)
  //    Ana:    OVER_HOURS on 10 (11h > 10h threshold), EARLY_START on 11 (07:30 < window 08:00)
  //    Mihai:  LATE_END on 19 (19:15 > window 18:00), MISSING_END on 26 (no clock-out), missing 27
  //    Diana:  missing 25-27 (3 days MISSING_DAY)
  console.log("Seeding February 2026 (mixed)...");

  const febDays = weekdays(2026, 2);
  const febRecords: { id: string; employeeId: string; date: Date; startTime: Date | null; endTime: Date | null; breaks: string; totalMinutes: number | null; status: string; dayType: string }[] = [];

  /** Default status based on date position in month */
  function febStatus(day: number): string {
    if (day <= 13) return "APPROVED";
    if (day <= 20) return "SUBMITTED";
    return "DRAFT";
  }

  /** Create a Feb workday + approval if APPROVED */
  async function febDay(
    empId: string,
    managerId: string | null,
    date: Date,
    status: string,
    opts?: Parameters<typeof buildWorkDay>[3]
  ) {
    const ts = await prisma.timesheetDay.create({
      data: buildWorkDay(empId, date, status, opts),
    });
    febRecords.push({ id: ts.id, employeeId: ts.employeeId, date: ts.date, startTime: ts.startTime, endTime: ts.endTime, breaks: ts.breaks ?? "[]", totalMinutes: ts.totalMinutes, status: ts.status, dayType: ts.dayType });
    if (status === "APPROVED") {
      await prisma.approval.create({
        data: {
          timesheetDayId: ts.id,
          approverId: managerId ?? admin.id,
          decision: "APPROVED",
        },
      });
    }
    return ts;
  }

  for (const emp of everyone) {
    const mgr = emp.managerId;

    for (const date of febDays) {
      const day = date.getUTCDate();

      // Ion: REJECTED on 18, missing 26-27
      if (emp.id === ion.id) {
        if (day >= 26) continue; // no record -> MISSING_DAY anomaly
        if (day === 18) {
          const ts = await prisma.timesheetDay.create({
            data: buildWorkDay(emp.id, date, "REJECTED"),
          });
          febRecords.push({ id: ts.id, employeeId: ts.employeeId, date: ts.date, startTime: ts.startTime, endTime: ts.endTime, breaks: ts.breaks ?? "[]", totalMinutes: ts.totalMinutes, status: ts.status, dayType: ts.dayType });
          await prisma.approval.create({
            data: {
              timesheetDayId: ts.id,
              approverId: maria.id,
              decision: "REJECTED",
              comment:
                "Ora de start nu corespunde cu pontajul de pe cartela. Va rog corectati si retrimiteti.",
            },
          });
          continue;
        }
        await febDay(emp.id, mgr, date, febStatus(day));
        continue;
      }

      // Elena: CO on Feb 12-13
      if (emp.id === elena.id) {
        if (day === 12 || day === 13) {
          const ts = await prisma.timesheetDay.create({
            data: { employeeId: emp.id, date, status: "APPROVED", dayType: "CO" },
          });
          febRecords.push({ id: ts.id, employeeId: ts.employeeId, date: ts.date, startTime: ts.startTime, endTime: ts.endTime, breaks: ts.breaks ?? "[]", totalMinutes: ts.totalMinutes, status: ts.status, dayType: ts.dayType });
          await prisma.approval.create({
            data: { timesheetDayId: ts.id, approverId: maria.id, decision: "APPROVED" },
          });
          continue;
        }
        await febDay(emp.id, mgr, date, febStatus(day));
        continue;
      }

      // George: UNDER_HOURS on Feb 17 (5.5h worked)
      if (emp.id === george.id) {
        if (day === 17) {
          await febDay(emp.id, mgr, date, "SUBMITTED", {
            startH: 9,
            startM: 30,
            endH: 15,
            endM: 30,
            totalMinutes: 330, // 5.5h - below 420min (87.5% of 8h) threshold
          });
          continue;
        }
        await febDay(emp.id, mgr, date, febStatus(day));
        continue;
      }

      // Ana: OVER_HOURS on Feb 10 (11h), EARLY_START on Feb 11 (07:30 < window 08:00)
      if (emp.id === ana.id) {
        if (day === 10) {
          await febDay(emp.id, mgr, date, "APPROVED", {
            startH: 7,
            startM: 0,
            endH: 18,
            endM: 30,
            totalMinutes: 660, // 11h - above 600min (10h) threshold
          });
          continue;
        }
        if (day === 11) {
          await febDay(emp.id, mgr, date, "APPROVED", {
            startH: 7,
            startM: 30,
            endH: 17,
            endM: 0,
            totalMinutes: 540, // 9h - 30min break = normal hours, but start is early
          });
          continue;
        }
        await febDay(emp.id, mgr, date, febStatus(day));
        continue;
      }

      // Mihai: LATE_END on 19 (19:15 > window 18:00), MISSING_END on 26, missing 27
      if (emp.id === mihai.id) {
        if (day === 19) {
          await febDay(emp.id, mgr, date, "SUBMITTED", {
            startH: 9,
            startM: 0,
            endH: 19,
            endM: 15,
            totalMinutes: 585, // 10h15m - 30min break
          });
          continue;
        }
        if (day === 27) continue; // no record -> MISSING_DAY anomaly
        if (day === 26) {
          const ts = await prisma.timesheetDay.create({
            data: buildWorkDay(emp.id, date, "DRAFT", { noEnd: true }),
          });
          febRecords.push({ id: ts.id, employeeId: ts.employeeId, date: ts.date, startTime: ts.startTime, endTime: ts.endTime, breaks: ts.breaks ?? "[]", totalMinutes: ts.totalMinutes, status: ts.status, dayType: ts.dayType });
          continue;
        }
        await febDay(emp.id, mgr, date, febStatus(day));
        continue;
      }

      // Diana: missing Feb 25-27 (3 consecutive MISSING_DAY)
      if (emp.id === diana.id) {
        if (day >= 25) continue; // no record -> MISSING_DAY anomaly
        await febDay(emp.id, mgr, date, febStatus(day));
        continue;
      }

      // Managers + default: standard status progression
      await febDay(emp.id, mgr, date, febStatus(day));
    }
  }

  // Audit Logs
  console.log("Seeding audit logs...");

  type AuditData = {
    entity: string;
    entityId: string;
    action: string;
    actorId: string;
    timestamp: Date;
    before: string | null;
    after: string | null;
  };

  const auditBatch: AuditData[] = [];

  // A. Schedule creation audits (admin created them)
  for (const sch of [fixSchedule, windowSchedule, flexSchedule]) {
    auditBatch.push({
      entity: "Schedule",
      entityId: sch.id,
      action: "CREATE",
      actorId: admin.id,
      timestamp: utcTime(2026, 1, 1, 8, 0),
      before: null,
      after: JSON.stringify({ name: sch.name, type: sch.type, startTime: sch.startTime, endTime: sch.endTime }),
    });
  }

  // B. Employee creation audits
  const allEmployees = [maria, andrei, ion, elena, george, ana, mihai, diana];
  for (let i = 0; i < allEmployees.length; i++) {
    const emp = allEmployees[i];
    auditBatch.push({
      entity: "Employee",
      entityId: emp.id,
      action: "CREATE",
      actorId: admin.id,
      timestamp: utcTime(2026, 1, 1, 8, 5 + i),
      before: null,
      after: JSON.stringify({ email: emp.email, firstName: emp.firstName, lastName: emp.lastName, role: emp.role, department: emp.department }),
    });
  }

  // C. January clock operation audits
  for (const ts of janRecords) {
    if (ts.dayType !== "WORK" || !ts.startTime) continue;

    // CLOCK_IN
    auditBatch.push({
      entity: "TimesheetDay", entityId: ts.id, action: "CLOCK_IN", actorId: ts.employeeId,
      timestamp: ts.startTime,
      before: null,
      after: JSON.stringify({ date: ts.date.toISOString(), startTime: ts.startTime.toISOString() }),
    });

    // CLOCK_PAUSE + CLOCK_RESUME (if breaks exist)
    const breaks = JSON.parse(ts.breaks) as { start: string; end?: string }[];
    if (breaks.length > 0 && breaks[0].start) {
      auditBatch.push({
        entity: "TimesheetDay", entityId: ts.id, action: "CLOCK_PAUSE", actorId: ts.employeeId,
        timestamp: new Date(breaks[0].start),
        before: null,
        after: JSON.stringify({ breakStart: breaks[0].start }),
      });
      if (breaks[0].end) {
        auditBatch.push({
          entity: "TimesheetDay", entityId: ts.id, action: "CLOCK_RESUME", actorId: ts.employeeId,
          timestamp: new Date(breaks[0].end),
          before: null,
          after: JSON.stringify({ breakEnd: breaks[0].end }),
        });
      }
    }

    // CLOCK_OUT
    if (ts.endTime) {
      auditBatch.push({
        entity: "TimesheetDay", entityId: ts.id, action: "CLOCK_OUT", actorId: ts.employeeId,
        timestamp: ts.endTime,
        before: JSON.stringify({ endTime: null }),
        after: JSON.stringify({ endTime: ts.endTime.toISOString(), totalMinutes: ts.totalMinutes }),
      });

      // SUBMIT (1 minute after clock-out)
      auditBatch.push({
        entity: "TimesheetDay", entityId: ts.id, action: "SUBMIT", actorId: ts.employeeId,
        timestamp: new Date(ts.endTime.getTime() + 60_000),
        before: JSON.stringify({ status: "DRAFT" }),
        after: JSON.stringify({ status: "SUBMITTED" }),
      });

      // APPROVE (1 hour after clock-out, by manager or admin)
      const emp = everyone.find(e => e.id === ts.employeeId);
      const approverId = emp?.managerId ?? admin.id;
      auditBatch.push({
        entity: "TimesheetDay", entityId: ts.id, action: "APPROVE", actorId: approverId,
        timestamp: new Date(ts.endTime.getTime() + 3600_000),
        before: JSON.stringify({ status: "SUBMITTED" }),
        after: JSON.stringify({ status: "APPROVED" }),
      });
    }
  }

  // Leave day audits for January
  // Elena CO Jan 15-16
  for (const d of [15, 16]) {
    const tsRecord = janRecords.find(r => r.employeeId === elena.id && r.date.getUTCDate() === d);
    if (tsRecord) {
      auditBatch.push({
        entity: "TimesheetDay", entityId: tsRecord.id, action: "CREATE", actorId: maria.id,
        timestamp: utcTime(2026, 1, d, 8, 0),
        before: null,
        after: JSON.stringify({ dayType: "CO", date: tsRecord.date.toISOString() }),
      });
    }
  }

  // George CM Jan 22
  const georgeCm = janRecords.find(r => r.employeeId === george.id && r.date.getUTCDate() === 22);
  if (georgeCm) {
    auditBatch.push({
      entity: "TimesheetDay", entityId: georgeCm.id, action: "CREATE", actorId: maria.id,
      timestamp: utcTime(2026, 1, 22, 8, 0),
      before: null,
      after: JSON.stringify({ dayType: "CM", date: georgeCm.date.toISOString() }),
    });
  }

  // January LOCK audit
  auditBatch.push({
    entity: "TimesheetDay", entityId: "month-2026-01", action: "LOCK", actorId: admin.id,
    timestamp: utcTime(2026, 2, 1, 9, 0),
    before: JSON.stringify({ status: "APPROVED" }),
    after: JSON.stringify({ status: "LOCKED", month: "2026-01" }),
  });

  // D. February clock operation audits
  for (const ts of febRecords) {
    if (ts.dayType !== "WORK" || !ts.startTime) continue;

    // CLOCK_IN for all work days that have a startTime
    auditBatch.push({
      entity: "TimesheetDay", entityId: ts.id, action: "CLOCK_IN", actorId: ts.employeeId,
      timestamp: ts.startTime,
      before: null,
      after: JSON.stringify({ date: ts.date.toISOString(), startTime: ts.startTime.toISOString() }),
    });

    const breaks = JSON.parse(ts.breaks) as { start: string; end?: string }[];
    if (breaks.length > 0 && breaks[0].start) {
      auditBatch.push({
        entity: "TimesheetDay", entityId: ts.id, action: "CLOCK_PAUSE", actorId: ts.employeeId,
        timestamp: new Date(breaks[0].start),
        before: null,
        after: JSON.stringify({ breakStart: breaks[0].start }),
      });
      if (breaks[0].end) {
        auditBatch.push({
          entity: "TimesheetDay", entityId: ts.id, action: "CLOCK_RESUME", actorId: ts.employeeId,
          timestamp: new Date(breaks[0].end),
          before: null,
          after: JSON.stringify({ breakEnd: breaks[0].end }),
        });
      }
    }

    if (ts.endTime) {
      auditBatch.push({
        entity: "TimesheetDay", entityId: ts.id, action: "CLOCK_OUT", actorId: ts.employeeId,
        timestamp: ts.endTime,
        before: JSON.stringify({ endTime: null }),
        after: JSON.stringify({ endTime: ts.endTime.toISOString(), totalMinutes: ts.totalMinutes }),
      });
    }

    // SUBMIT only for SUBMITTED or APPROVED status
    if ((ts.status === "SUBMITTED" || ts.status === "APPROVED") && ts.endTime) {
      auditBatch.push({
        entity: "TimesheetDay", entityId: ts.id, action: "SUBMIT", actorId: ts.employeeId,
        timestamp: new Date(ts.endTime.getTime() + 60_000),
        before: JSON.stringify({ status: "DRAFT" }),
        after: JSON.stringify({ status: "SUBMITTED" }),
      });
    }

    // APPROVE only for APPROVED status
    if (ts.status === "APPROVED" && ts.endTime) {
      const emp = everyone.find(e => e.id === ts.employeeId);
      const approverId = emp?.managerId ?? admin.id;
      auditBatch.push({
        entity: "TimesheetDay", entityId: ts.id, action: "APPROVE", actorId: approverId,
        timestamp: new Date(ts.endTime.getTime() + 3600_000),
        before: JSON.stringify({ status: "SUBMITTED" }),
        after: JSON.stringify({ status: "APPROVED" }),
      });
    }

    // REJECT for Ion's Feb 18 (status === "REJECTED")
    if (ts.status === "REJECTED" && ts.endTime) {
      auditBatch.push({
        entity: "TimesheetDay", entityId: ts.id, action: "REJECT", actorId: maria.id,
        timestamp: new Date(ts.endTime.getTime() + 3600_000),
        before: JSON.stringify({ status: "SUBMITTED" }),
        after: JSON.stringify({ status: "REJECTED", comment: "Ora de start nu corespunde cu pontajul de pe cartela. Va rog corectati si retrimiteti." }),
      });
    }
  }

  // Elena CO Feb 12-13
  for (const d of [12, 13]) {
    const tsRecord = febRecords.find(r => r.employeeId === elena.id && r.date.getUTCDate() === d);
    if (tsRecord) {
      auditBatch.push({
        entity: "TimesheetDay", entityId: tsRecord.id, action: "CREATE", actorId: maria.id,
        timestamp: utcTime(2026, 2, d, 8, 0),
        before: null,
        after: JSON.stringify({ dayType: "CO", date: tsRecord.date.toISOString() }),
      });
    }
  }

  // Batch insert all audit records
  await prisma.auditLog.createMany({ data: auditBatch });
  console.log(`  ${auditBatch.length} audit log entries created`);

  // Summary
  console.log("\nSeed completed!");
  console.log("");
  console.log("Demo accounts:");
  console.log("  Admin:    admin@lextiming.com    / admin123");
  console.log("  Manager:  maria@lextiming.com    / manager123");
  console.log("  Manager:  andrei@lextiming.com   / manager123");
  console.log("  Employee: ion@lextiming.com      / employee123");
  console.log("  Employee: elena@lextiming.com    / employee123");
  console.log("  Employee: george@lextiming.com   / employee123");
  console.log("  Employee: ana@lextiming.com      / employee123");
  console.log("  Employee: mihai@lextiming.com    / employee123");
  console.log("  Employee: diana@lextiming.com    / employee123");
  console.log("");
  console.log("Schedules:");
  console.log("  Fix 9-17:               Admin, HR team (Maria, Ion, Elena, George)");
  console.log("  Fereastra 8-10 -> 16-18: Engineering (Andrei, Ana, Mihai)");
  console.log("  Flexibil (min 6h):      Diana (remote)");
  console.log("");
  console.log("January 2026:  Fully LOCKED (finalized month)");
  console.log("February 2026: Mixed - APPROVED / SUBMITTED / DRAFT / REJECTED / CO / anomalies");
  console.log("");
  console.log("February anomalies to demo:");
  console.log("  Ion:    REJECTED day (Feb 18) + MISSING_DAY (Feb 26-27)");
  console.log("  George: UNDER_HOURS (Feb 17, 5.5h)");
  console.log("  Ana:    OVER_HOURS (Feb 10, 11h) + EARLY_START (Feb 11, 07:30 < window 08:00)");
  console.log("  Mihai:  MISSING_END (Feb 26) + MISSING_DAY (Feb 27) + LATE_END (Feb 19, 19:15 > window 18:00)");
  console.log("  Diana:  MISSING_DAY (Feb 25-27)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
