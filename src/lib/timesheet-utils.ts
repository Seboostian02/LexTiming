import { CLOCK_STATES, DAY_TYPE, type ClockState } from "./constants";
import type { Break } from "@/types/timesheet";

// ---------------------------------------------------------------------------
// Pure utility functions - extracted for testability
// ---------------------------------------------------------------------------

/** Safely parse the JSON breaks column (stored as a string). */
export function parseBreaks(raw: string | null | undefined): Break[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Total break minutes from a list of Break entries. Open breaks use `referenceTime` as end. */
export function totalBreakMinutes(
  breaks: Break[],
  referenceTime: Date = new Date()
): number {
  return breaks.reduce((sum, b) => {
    const start = new Date(b.start).getTime();
    const end = b.end ? new Date(b.end).getTime() : referenceTime.getTime();
    return sum + (end - start) / 60_000;
  }, 0);
}

/** Derive the clock state from a TimesheetDay record. */
export function deriveClockState(
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
export function computeElapsedMinutes(
  record: {
    startTime: Date | null;
    endTime: Date | null;
    breaks: string;
    totalMinutes: number | null;
  } | null,
  referenceTime: Date = new Date()
): number {
  if (!record || !record.startTime) return 0;

  if (record.endTime && record.totalMinutes !== null) {
    return record.totalMinutes;
  }

  const start = new Date(record.startTime).getTime();
  const end = record.endTime
    ? new Date(record.endTime).getTime()
    : referenceTime.getTime();

  const grossMinutes = (end - start) / 60_000;
  const breaks = parseBreaks(record.breaks);
  const breakMins = totalBreakMinutes(breaks, referenceTime);

  return Math.max(0, Math.round(grossMinutes - breakMins));
}

/** Parse "HH:MM" to minutes since midnight. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Extract minutes since midnight from a UTC Date. */
export function dateToMinutes(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** Detect anomalies for a single timesheet record given employee schedule context. */
export function detectAnomalies(
  record: {
    date: Date;
    startTime: Date | null;
    endTime: Date | null;
    totalMinutes: number | null;
    dayType: string;
  },
  schedule: {
    type: string;
    startTime: string;
    endTime: string;
    startWindowEnd: string | null;
    endWindowStart: string | null;
    earlyStartMinutes: number;
    lateEndMinutes: number;
  } | null,
  hoursPerDay: number,
  referenceDate: Date = new Date()
): string[] {
  const anomalies: string[] = [];
  const todayUTC = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate()
    )
  );
  const isPastDay = record.date.getTime() < todayUTC.getTime();
  const minExpectedMinutes = hoursPerDay * 60 * 0.875;

  // MISSING_END: past day with clock-in but no clock-out
  if (isPastDay && record.startTime && !record.endTime) {
    anomalies.push("MISSING_END");
  }

  // UNDER_HOURS: completed day with insufficient hours
  if (
    record.dayType === DAY_TYPE.WORK &&
    record.endTime &&
    record.totalMinutes !== null &&
    record.totalMinutes < minExpectedMinutes
  ) {
    anomalies.push("UNDER_HOURS");
  }

  // OVER_HOURS: completed day exceeding 10 hours
  if (
    record.dayType === DAY_TYPE.WORK &&
    record.endTime &&
    record.totalMinutes !== null &&
    record.totalMinutes > 600
  ) {
    anomalies.push("OVER_HOURS");
  }

  // Schedule-based anomalies
  if (schedule && record.dayType === DAY_TYPE.WORK && record.startTime) {
    const startMin = dateToMinutes(record.startTime);

    if (schedule.type === "FIX") {
      const fixStart = timeToMinutes(schedule.startTime);
      const fixEnd = timeToMinutes(schedule.endTime);

      if (startMin < fixStart - schedule.earlyStartMinutes) {
        anomalies.push("EARLY_START");
      }
      if (record.endTime) {
        const endMin = dateToMinutes(record.endTime);
        if (endMin > fixEnd + schedule.lateEndMinutes) {
          anomalies.push("LATE_END");
        }
      }
    } else if (
      schedule.type === "FEREASTRA" &&
      schedule.startWindowEnd &&
      schedule.endWindowStart
    ) {
      const windowStartFrom = timeToMinutes(schedule.startTime);
      const windowEndTo = timeToMinutes(schedule.endTime);

      if (startMin < windowStartFrom) {
        anomalies.push("EARLY_START");
      }
      if (record.endTime) {
        const endMin = dateToMinutes(record.endTime);
        if (endMin > windowEndTo) {
          anomalies.push("LATE_END");
        }
      }
    }
  }

  return anomalies;
}
