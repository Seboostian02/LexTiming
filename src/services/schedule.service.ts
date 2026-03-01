import { prisma } from "@/lib/prisma";
import type {
  CreateScheduleInput,
  UpdateScheduleInput,
} from "@/schemas/schedule.schema";
import { createAuditLog } from "@/services/audit.service";

export async function getAllSchedules() {
  const schedules = await prisma.schedule.findMany({
    orderBy: { name: "asc" },
  });

  return schedules.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));
}

export async function getSchedule(id: string) {
  const schedule = await prisma.schedule.findUnique({
    where: { id },
  });

  if (!schedule) {
    throw new Error("Schedule not found");
  }

  return {
    ...schedule,
    createdAt: schedule.createdAt.toISOString(),
  };
}

export async function createSchedule(data: CreateScheduleInput, actorId: string) {
  const schedule = await prisma.schedule.create({
    data: {
      name: data.name,
      type: data.type ?? "FIX",
      startTime: data.startTime,
      endTime: data.endTime,
      startWindowEnd: data.startWindowEnd ?? null,
      endWindowStart: data.endWindowStart ?? null,
      earlyStartMinutes: data.earlyStartMinutes ?? 30,
      lateEndMinutes: data.lateEndMinutes ?? 30,
      minHoursPerDay: data.minHoursPerDay ?? 8,
      breakMinutes: data.breakMinutes ?? 30,
    },
  });

  await createAuditLog({
    entity: "Schedule",
    entityId: schedule.id,
    action: "CREATE",
    actorId,
    after: { name: schedule.name, type: schedule.type, startTime: schedule.startTime, endTime: schedule.endTime },
  });

  return {
    ...schedule,
    createdAt: schedule.createdAt.toISOString(),
  };
}

export async function updateSchedule(
  id: string,
  data: UpdateScheduleInput,
  actorId: string
) {
  const schedule = await prisma.schedule.findUnique({
    where: { id },
  });

  if (!schedule) {
    throw new Error("Schedule not found");
  }

  const updated = await prisma.schedule.update({
    where: { id },
    data: {
      name: data.name,
      type: data.type,
      startTime: data.startTime,
      endTime: data.endTime,
      startWindowEnd: data.startWindowEnd,
      endWindowStart: data.endWindowStart,
      earlyStartMinutes: data.earlyStartMinutes,
      lateEndMinutes: data.lateEndMinutes,
      minHoursPerDay: data.minHoursPerDay,
      breakMinutes: data.breakMinutes,
    },
  });

  await createAuditLog({
    entity: "Schedule",
    entityId: id,
    action: "UPDATE",
    actorId,
    before: { name: schedule.name, type: schedule.type, startTime: schedule.startTime, endTime: schedule.endTime },
    after: { name: updated.name, type: updated.type, startTime: updated.startTime, endTime: updated.endTime },
  });

  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function deleteSchedule(id: string, actorId: string) {
  const schedule = await prisma.schedule.findUnique({
    where: { id },
    include: {
      _count: {
        select: { employees: true },
      },
    },
  });

  if (!schedule) {
    throw new Error("Schedule not found");
  }

  if (schedule._count.employees > 0) {
    throw new Error(
      `Cannot delete schedule: ${schedule._count.employees} employee(s) are still assigned to it`
    );
  }

  await prisma.schedule.delete({
    where: { id },
  });

  await createAuditLog({
    entity: "Schedule",
    entityId: id,
    action: "DELETE",
    actorId,
    before: { name: schedule.name, type: schedule.type },
  });
}
