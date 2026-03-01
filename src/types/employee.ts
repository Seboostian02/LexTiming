import type { EmployeeStatus, Role } from "@/lib/constants";

export interface Employee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  department: string | null;
  status: EmployeeStatus;
  hoursPerDay: number;
  managerId: string | null;
  scheduleId: string | null;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  schedule?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

export interface CreateEmployeeRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  department?: string;
  hoursPerDay?: number;
  managerId?: string;
  scheduleId?: string;
}

export interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  role?: Role;
  department?: string | null;
  status?: EmployeeStatus;
  hoursPerDay?: number;
  managerId?: string | null;
  scheduleId?: string | null;
}

export interface TeamMember extends Employee {
  currentStatus: string; // ClockState
  hoursToday: number | null;
  anomalyCount: number;
}
