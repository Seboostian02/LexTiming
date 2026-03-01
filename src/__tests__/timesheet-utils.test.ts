import { describe, it, expect } from "vitest";
import {
  parseBreaks,
  totalBreakMinutes,
  deriveClockState,
  computeElapsedMinutes,
  timeToMinutes,
  dateToMinutes,
  detectAnomalies,
} from "@/lib/timesheet-utils";

// ---------------------------------------------------------------------------
// parseBreaks
// ---------------------------------------------------------------------------

describe("parseBreaks", () => {
  it("returns empty array for null", () => {
    expect(parseBreaks(null)).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(parseBreaks(undefined)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseBreaks("")).toEqual([]);
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseBreaks("{not json}")).toEqual([]);
  });

  it("returns empty array for non-array JSON", () => {
    expect(parseBreaks('{"key": "value"}')).toEqual([]);
  });

  it("parses valid break array", () => {
    const breaks = JSON.stringify([
      { start: "2026-02-10T12:00:00Z", end: "2026-02-10T12:30:00Z" },
    ]);
    const result = parseBreaks(breaks);
    expect(result).toHaveLength(1);
    expect(result[0].start).toBe("2026-02-10T12:00:00Z");
    expect(result[0].end).toBe("2026-02-10T12:30:00Z");
  });

  it("parses open break (no end)", () => {
    const breaks = JSON.stringify([{ start: "2026-02-10T12:00:00Z" }]);
    const result = parseBreaks(breaks);
    expect(result).toHaveLength(1);
    expect(result[0].end).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// totalBreakMinutes
// ---------------------------------------------------------------------------

describe("totalBreakMinutes", () => {
  it("returns 0 for empty array", () => {
    expect(totalBreakMinutes([])).toBe(0);
  });

  it("calculates closed break duration", () => {
    const breaks = [
      { start: "2026-02-10T12:00:00Z", end: "2026-02-10T12:30:00Z" },
    ];
    expect(totalBreakMinutes(breaks)).toBe(30);
  });

  it("sums multiple closed breaks", () => {
    const breaks = [
      { start: "2026-02-10T10:00:00Z", end: "2026-02-10T10:15:00Z" },
      { start: "2026-02-10T12:00:00Z", end: "2026-02-10T12:30:00Z" },
    ];
    expect(totalBreakMinutes(breaks)).toBe(45);
  });

  it("uses referenceTime for open break", () => {
    const refTime = new Date("2026-02-10T13:00:00Z");
    const breaks = [{ start: "2026-02-10T12:00:00Z" }];
    expect(totalBreakMinutes(breaks, refTime)).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// timeToMinutes
// ---------------------------------------------------------------------------

describe("timeToMinutes", () => {
  it("converts 00:00 to 0", () => {
    expect(timeToMinutes("00:00")).toBe(0);
  });

  it("converts 09:00 to 540", () => {
    expect(timeToMinutes("09:00")).toBe(540);
  });

  it("converts 17:30 to 1050", () => {
    expect(timeToMinutes("17:30")).toBe(1050);
  });

  it("converts 23:59 to 1439", () => {
    expect(timeToMinutes("23:59")).toBe(1439);
  });
});

// ---------------------------------------------------------------------------
// dateToMinutes
// ---------------------------------------------------------------------------

describe("dateToMinutes", () => {
  it("extracts minutes from midnight UTC date", () => {
    expect(dateToMinutes(new Date("2026-02-10T00:00:00Z"))).toBe(0);
  });

  it("extracts minutes from 09:15 UTC", () => {
    expect(dateToMinutes(new Date("2026-02-10T09:15:00Z"))).toBe(555);
  });

  it("extracts minutes from 17:00 UTC", () => {
    expect(dateToMinutes(new Date("2026-02-10T17:00:00Z"))).toBe(1020);
  });
});

// ---------------------------------------------------------------------------
// deriveClockState
// ---------------------------------------------------------------------------

describe("deriveClockState", () => {
  it("returns NOT_CLOCKED for null record", () => {
    expect(deriveClockState(null)).toBe("NOT_CLOCKED");
  });

  it("returns NOT_CLOCKED when no startTime", () => {
    expect(
      deriveClockState({ startTime: null, endTime: null, breaks: "[]" })
    ).toBe("NOT_CLOCKED");
  });

  it("returns STOPPED when endTime exists", () => {
    expect(
      deriveClockState({
        startTime: new Date("2026-02-10T09:00:00Z"),
        endTime: new Date("2026-02-10T17:00:00Z"),
        breaks: "[]",
      })
    ).toBe("STOPPED");
  });

  it("returns WORKING with no open breaks", () => {
    const breaks = JSON.stringify([
      { start: "2026-02-10T12:00:00Z", end: "2026-02-10T12:30:00Z" },
    ]);
    expect(
      deriveClockState({
        startTime: new Date("2026-02-10T09:00:00Z"),
        endTime: null,
        breaks,
      })
    ).toBe("WORKING");
  });

  it("returns ON_BREAK with open break", () => {
    const breaks = JSON.stringify([{ start: "2026-02-10T12:00:00Z" }]);
    expect(
      deriveClockState({
        startTime: new Date("2026-02-10T09:00:00Z"),
        endTime: null,
        breaks,
      })
    ).toBe("ON_BREAK");
  });
});

// ---------------------------------------------------------------------------
// computeElapsedMinutes
// ---------------------------------------------------------------------------

describe("computeElapsedMinutes", () => {
  it("returns 0 for null record", () => {
    expect(computeElapsedMinutes(null)).toBe(0);
  });

  it("returns 0 when no startTime", () => {
    expect(
      computeElapsedMinutes({
        startTime: null,
        endTime: null,
        breaks: "[]",
        totalMinutes: null,
      })
    ).toBe(0);
  });

  it("returns stored totalMinutes when stopped", () => {
    expect(
      computeElapsedMinutes({
        startTime: new Date("2026-02-10T09:00:00Z"),
        endTime: new Date("2026-02-10T17:00:00Z"),
        breaks: "[]",
        totalMinutes: 450,
      })
    ).toBe(450);
  });

  it("calculates elapsed with referenceTime for ongoing work", () => {
    const refTime = new Date("2026-02-10T12:00:00Z");
    expect(
      computeElapsedMinutes(
        {
          startTime: new Date("2026-02-10T09:00:00Z"),
          endTime: null,
          breaks: "[]",
          totalMinutes: null,
        },
        refTime
      )
    ).toBe(180); // 3 hours
  });

  it("subtracts break time from elapsed", () => {
    const breaks = JSON.stringify([
      { start: "2026-02-10T12:00:00Z", end: "2026-02-10T12:30:00Z" },
    ]);
    const refTime = new Date("2026-02-10T17:00:00Z");
    expect(
      computeElapsedMinutes(
        {
          startTime: new Date("2026-02-10T09:00:00Z"),
          endTime: null,
          breaks,
          totalMinutes: null,
        },
        refTime
      )
    ).toBe(450); // 8h - 30min break = 450min
  });
});

// ---------------------------------------------------------------------------
// detectAnomalies
// ---------------------------------------------------------------------------

describe("detectAnomalies", () => {
  // Reference date: Feb 28 2026 - all test dates before this are "past"
  const refDate = new Date("2026-02-28T12:00:00Z");

  const fixSchedule = {
    type: "FIX",
    startTime: "09:00",
    endTime: "17:00",
    startWindowEnd: null,
    endWindowStart: null,
    earlyStartMinutes: 30,
    lateEndMinutes: 30,
  };

  const windowSchedule = {
    type: "FEREASTRA",
    startTime: "08:00",
    endTime: "18:00",
    startWindowEnd: "10:00",
    endWindowStart: "16:00",
    earlyStartMinutes: 0,
    lateEndMinutes: 0,
  };

  it("detects MISSING_END on past day with start but no end", () => {
    const result = detectAnomalies(
      {
        date: new Date("2026-02-26T00:00:00Z"),
        startTime: new Date("2026-02-26T09:00:00Z"),
        endTime: null,
        totalMinutes: null,
        dayType: "WORK",
      },
      null,
      8,
      refDate
    );
    expect(result).toContain("MISSING_END");
  });

  it("does NOT detect MISSING_END on today", () => {
    const today = new Date("2026-02-28T00:00:00Z");
    const result = detectAnomalies(
      {
        date: today,
        startTime: new Date("2026-02-28T09:00:00Z"),
        endTime: null,
        totalMinutes: null,
        dayType: "WORK",
      },
      null,
      8,
      refDate
    );
    expect(result).not.toContain("MISSING_END");
  });

  it("detects UNDER_HOURS when totalMinutes below threshold", () => {
    // 8h * 60 * 0.875 = 420 min threshold
    const result = detectAnomalies(
      {
        date: new Date("2026-02-17T00:00:00Z"),
        startTime: new Date("2026-02-17T09:30:00Z"),
        endTime: new Date("2026-02-17T15:30:00Z"),
        totalMinutes: 330, // 5.5h - below 420min threshold
        dayType: "WORK",
      },
      null,
      8,
      refDate
    );
    expect(result).toContain("UNDER_HOURS");
  });

  it("does NOT detect UNDER_HOURS on leave day", () => {
    const result = detectAnomalies(
      {
        date: new Date("2026-02-17T00:00:00Z"),
        startTime: new Date("2026-02-17T09:00:00Z"),
        endTime: new Date("2026-02-17T12:00:00Z"),
        totalMinutes: 180,
        dayType: "CO",
      },
      null,
      8,
      refDate
    );
    expect(result).not.toContain("UNDER_HOURS");
  });

  it("detects OVER_HOURS when totalMinutes exceeds 600", () => {
    const result = detectAnomalies(
      {
        date: new Date("2026-02-10T00:00:00Z"),
        startTime: new Date("2026-02-10T07:00:00Z"),
        endTime: new Date("2026-02-10T18:30:00Z"),
        totalMinutes: 660, // 11h
        dayType: "WORK",
      },
      null,
      8,
      refDate
    );
    expect(result).toContain("OVER_HOURS");
  });

  it("detects EARLY_START on FIX schedule", () => {
    // FIX 09:00-17:00 with 30min tolerance
    // Clock-in at 08:00, before 08:30 threshold -> EARLY_START
    const result = detectAnomalies(
      {
        date: new Date("2026-02-10T00:00:00Z"),
        startTime: new Date("2026-02-10T08:00:00Z"),
        endTime: new Date("2026-02-10T17:00:00Z"),
        totalMinutes: 510,
        dayType: "WORK",
      },
      fixSchedule,
      8,
      refDate
    );
    expect(result).toContain("EARLY_START");
  });

  it("does NOT detect EARLY_START within FIX tolerance", () => {
    // Clock-in at 08:35, after 08:30 threshold -> OK
    const result = detectAnomalies(
      {
        date: new Date("2026-02-10T00:00:00Z"),
        startTime: new Date("2026-02-10T08:35:00Z"),
        endTime: new Date("2026-02-10T17:00:00Z"),
        totalMinutes: 475,
        dayType: "WORK",
      },
      fixSchedule,
      8,
      refDate
    );
    expect(result).not.toContain("EARLY_START");
  });

  it("detects LATE_END on FIX schedule", () => {
    // FIX 09:00-17:00 with 30min tolerance
    // Clock-out at 17:45, after 17:30 threshold -> LATE_END
    const result = detectAnomalies(
      {
        date: new Date("2026-02-10T00:00:00Z"),
        startTime: new Date("2026-02-10T09:00:00Z"),
        endTime: new Date("2026-02-10T17:45:00Z"),
        totalMinutes: 495,
        dayType: "WORK",
      },
      fixSchedule,
      8,
      refDate
    );
    expect(result).toContain("LATE_END");
  });

  it("detects EARLY_START on FEREASTRA schedule", () => {
    // Window: start 08:00-10:00, end 16:00-18:00
    // Clock-in at 07:30, before 08:00 window -> EARLY_START
    const result = detectAnomalies(
      {
        date: new Date("2026-02-11T00:00:00Z"),
        startTime: new Date("2026-02-11T07:30:00Z"),
        endTime: new Date("2026-02-11T17:00:00Z"),
        totalMinutes: 540,
        dayType: "WORK",
      },
      windowSchedule,
      8,
      refDate
    );
    expect(result).toContain("EARLY_START");
  });

  it("detects LATE_END on FEREASTRA schedule", () => {
    // Window: end 16:00-18:00
    // Clock-out at 19:15, after 18:00 window end -> LATE_END
    const result = detectAnomalies(
      {
        date: new Date("2026-02-19T00:00:00Z"),
        startTime: new Date("2026-02-19T09:00:00Z"),
        endTime: new Date("2026-02-19T19:15:00Z"),
        totalMinutes: 585,
        dayType: "WORK",
      },
      windowSchedule,
      8,
      refDate
    );
    expect(result).toContain("LATE_END");
  });

  it("does NOT trigger schedule anomalies for FLEX type", () => {
    const flexSchedule = {
      type: "FLEX",
      startTime: "07:00",
      endTime: "21:00",
      startWindowEnd: null,
      endWindowStart: null,
      earlyStartMinutes: 0,
      lateEndMinutes: 0,
    };
    const result = detectAnomalies(
      {
        date: new Date("2026-02-10T00:00:00Z"),
        startTime: new Date("2026-02-10T06:00:00Z"),
        endTime: new Date("2026-02-10T22:00:00Z"),
        totalMinutes: 930,
        dayType: "WORK",
      },
      flexSchedule,
      6,
      refDate
    );
    expect(result).not.toContain("EARLY_START");
    expect(result).not.toContain("LATE_END");
    // But should still detect OVER_HOURS (> 600min)
    expect(result).toContain("OVER_HOURS");
  });

  it("detects multiple anomalies simultaneously", () => {
    // Past day, UNDER_HOURS + EARLY_START on FIX
    const result = detectAnomalies(
      {
        date: new Date("2026-02-10T00:00:00Z"),
        startTime: new Date("2026-02-10T07:00:00Z"),
        endTime: new Date("2026-02-10T11:00:00Z"),
        totalMinutes: 210, // 3.5h - under threshold
        dayType: "WORK",
      },
      fixSchedule,
      8,
      refDate
    );
    expect(result).toContain("EARLY_START");
    expect(result).toContain("UNDER_HOURS");
    expect(result).toHaveLength(2);
  });

  it("returns empty array for normal day with no anomalies", () => {
    const result = detectAnomalies(
      {
        date: new Date("2026-02-10T00:00:00Z"),
        startTime: new Date("2026-02-10T09:00:00Z"),
        endTime: new Date("2026-02-10T17:00:00Z"),
        totalMinutes: 450,
        dayType: "WORK",
      },
      fixSchedule,
      8,
      refDate
    );
    expect(result).toEqual([]);
  });
});
