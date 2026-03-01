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

export type ClockActionInput = z.infer<typeof clockActionSchema>;
export type UpdateTimesheetInput = z.infer<typeof updateTimesheetSchema>;
