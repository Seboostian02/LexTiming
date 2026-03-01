import { z } from "zod";

export const createEmployeeSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]),
  department: z.string().optional(),
  hoursPerDay: z.number().min(1).max(24).optional(),
  managerId: z.string().optional(),
  scheduleId: z.string().optional(),
});

export const updateEmployeeSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]).optional(),
  department: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  hoursPerDay: z.number().min(1).max(24).optional(),
  managerId: z.string().optional().nullable(),
  scheduleId: z.string().optional().nullable(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
