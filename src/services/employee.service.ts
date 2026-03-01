import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from "@/schemas/employee.schema";
import { createAuditLog } from "@/services/audit.service";

const employeeSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  department: true,
  status: true,
  hoursPerDay: true,
  managerId: true,
  scheduleId: true,
  createdAt: true,
  manager: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  schedule: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export async function getAllEmployees() {
  const employees = await prisma.employee.findMany({
    select: employeeSelect,
    orderBy: { lastName: "asc" },
  });

  return employees.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
  }));
}

export async function getEmployee(id: string) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    select: employeeSelect,
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  return {
    ...employee,
    createdAt: employee.createdAt.toISOString(),
  };
}

export async function createEmployee(data: CreateEmployeeInput, actorId: string) {
  const existing = await prisma.employee.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await hashPassword(data.password);

  const employee = await prisma.employee.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      department: data.department ?? null,
      hoursPerDay: data.hoursPerDay ?? 8,
      managerId: data.managerId ?? null,
      scheduleId: data.scheduleId ?? null,
    },
    select: employeeSelect,
  });

  await createAuditLog({
    entity: "Employee",
    entityId: employee.id,
    action: "CREATE",
    actorId,
    after: { email: data.email.toLowerCase(), firstName: data.firstName, lastName: data.lastName, role: data.role, department: data.department ?? null },
  });

  return {
    ...employee,
    createdAt: employee.createdAt.toISOString(),
  };
}

export async function updateEmployee(
  id: string,
  data: UpdateEmployeeInput,
  actorId: string
) {
  const employee = await prisma.employee.findUnique({
    where: { id },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  const updated = await prisma.employee.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      department: data.department,
      status: data.status,
      hoursPerDay: data.hoursPerDay,
      managerId: data.managerId,
      scheduleId: data.scheduleId,
    },
    select: employeeSelect,
  });

  await createAuditLog({
    entity: "Employee",
    entityId: id,
    action: "UPDATE",
    actorId,
    before: { firstName: employee.firstName, lastName: employee.lastName, role: employee.role, department: employee.department, status: employee.status },
    after: { firstName: updated.firstName, lastName: updated.lastName, role: updated.role, department: updated.department, status: updated.status },
  });

  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function deleteEmployee(id: string, actorId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  await prisma.employee.update({
    where: { id },
    data: { status: "INACTIVE" },
  });

  await createAuditLog({
    entity: "Employee",
    entityId: id,
    action: "UPDATE",
    actorId,
    before: { status: employee.status },
    after: { status: "INACTIVE" },
  });
}

export async function getManagers() {
  const managers = await prisma.employee.findMany({
    where: {
      role: { in: ["MANAGER", "ADMIN"] },
      status: "ACTIVE",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
    },
    orderBy: { lastName: "asc" },
  });

  return managers;
}
