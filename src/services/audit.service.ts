import { prisma } from "@/lib/prisma";
import type {
  AuditLogEntry,
  AuditLogFilters,
  PaginatedAuditLogs,
} from "@/types/audit";

export async function createAuditLog(params: {
  entity: string;
  entityId: string;
  action: string;
  actorId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      entity: params.entity,
      entityId: params.entityId,
      action: params.action,
      actorId: params.actorId,
      before: params.before ? JSON.stringify(params.before) : null,
      after: params.after ? JSON.stringify(params.after) : null,
    },
  });
}

export async function getAuditLogs(
  filters: AuditLogFilters
): Promise<PaginatedAuditLogs> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const skip = (page - 1) * pageSize;

  const where: {
    entity?: string;
    action?: string;
    actorId?: string;
    timestamp?: { gte?: Date; lte?: Date };
  } = {};

  if (filters.entity) where.entity = filters.entity;
  if (filters.action) where.action = filters.action;
  if (filters.actorId) where.actorId = filters.actorId;
  if (filters.dateFrom || filters.dateTo) {
    where.timestamp = {};
    if (filters.dateFrom) where.timestamp.gte = new Date(filters.dateFrom);
    if (filters.dateTo)
      where.timestamp.lte = new Date(filters.dateTo + "T23:59:59.999Z");
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { timestamp: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const mapped: AuditLogEntry[] = items.map((item) => ({
    id: item.id,
    entity: item.entity,
    entityId: item.entityId,
    action: item.action,
    before: item.before
      ? (JSON.parse(item.before) as Record<string, unknown>)
      : null,
    after: item.after
      ? (JSON.parse(item.after) as Record<string, unknown>)
      : null,
    actorId: item.actorId,
    actor: {
      firstName: item.actor.firstName,
      lastName: item.actor.lastName,
      email: item.actor.email,
    },
    timestamp: item.timestamp.toISOString(),
  }));

  return {
    items: mapped,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getAuditActors(): Promise<
  { id: string; firstName: string; lastName: string }[]
> {
  const actors = await prisma.auditLog.findMany({
    select: { actorId: true },
    distinct: ["actorId"],
  });

  return prisma.employee.findMany({
    where: { id: { in: actors.map((a) => a.actorId) } },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { lastName: "asc" },
  });
}
