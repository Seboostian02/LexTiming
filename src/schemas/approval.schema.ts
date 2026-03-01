import { z } from "zod";

export const processApprovalSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().optional(),
});

export type ProcessApprovalInput = z.infer<typeof processApprovalSchema>;
