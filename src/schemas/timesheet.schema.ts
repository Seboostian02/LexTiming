import { z } from "zod";

export const clockActionSchema = z.object({
  action: z.enum(["START", "PAUSE", "RESUME", "STOP"]),
});

export const updateTimesheetSchema = z.object({
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  breaks: z
    .array(
      z.object({
        start: z.string(),
        end: z.string().optional(),
      })
    )
    .optional(),
  note: z.string().optional(),
});

export const manualTimesheetSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  note: z.string().optional(),
});

export type ClockActionInput = z.infer<typeof clockActionSchema>;
export type UpdateTimesheetInput = z.infer<typeof updateTimesheetSchema>;
export type ManualTimesheetInput = z.infer<typeof manualTimesheetSchema>;
