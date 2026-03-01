import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const scheduleBaseSchema = z.object({
  name: z.string().min(1, "Schedule name is required"),
  type: z.enum(["FIX", "FEREASTRA", "FLEX"]).default("FIX"),
  startTime: z.string().regex(timeRegex, "Invalid time format (HH:MM)"),
  endTime: z.string().regex(timeRegex, "Invalid time format (HH:MM)"),
  startWindowEnd: z.string().regex(timeRegex, "Invalid time format (HH:MM)").nullable().optional(),
  endWindowStart: z.string().regex(timeRegex, "Invalid time format (HH:MM)").nullable().optional(),
  earlyStartMinutes: z.number().min(0).max(120).default(30),
  lateEndMinutes: z.number().min(0).max(120).default(30),
  minHoursPerDay: z.number().min(1).max(24).default(8),
  breakMinutes: z.number().min(0).max(120).default(30),
});

export const createScheduleSchema = scheduleBaseSchema.superRefine((data, ctx) => {
  if (data.type === "FEREASTRA") {
    if (!data.startWindowEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start window end is required for FEREASTRA type",
        path: ["startWindowEnd"],
      });
    }
    if (!data.endWindowStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End window start is required for FEREASTRA type",
        path: ["endWindowStart"],
      });
    }
  }
});

export const updateScheduleSchema = scheduleBaseSchema.partial();

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
