import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { PaginatedAuditLogs, AuditLogFilters } from "@/types/audit";

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery<PaginatedAuditLogs>({
    queryKey: [
      "audit-logs",
      filters.entity,
      filters.action,
      filters.actorId,
      filters.dateFrom,
      filters.dateTo,
      filters.page,
      filters.pageSize,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.entity) params.set("entity", filters.entity);
      if (filters.action) params.set("action", filters.action);
      if (filters.actorId) params.set("actorId", filters.actorId);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.page) params.set("page", filters.page.toString());
      if (filters.pageSize) params.set("pageSize", filters.pageSize.toString());

      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      const json: ApiResponse<PaginatedAuditLogs> = await res.json();
      if (!json.success)
        throw new Error(json.error || "Failed to fetch audit logs");
      return json.data as PaginatedAuditLogs;
    },
  });
}

export function useAuditActors() {
  return useQuery<{ id: string; firstName: string; lastName: string }[]>({
    queryKey: ["audit-actors"],
    queryFn: async () => {
      const res = await fetch("/api/admin/audit?actors=true");
      if (!res.ok) throw new Error("Failed to fetch actors");
      const json: ApiResponse<
        { id: string; firstName: string; lastName: string }[]
      > = await res.json();
      if (!json.success)
        throw new Error(json.error || "Failed to fetch actors");
      return json.data ?? [];
    },
  });
}
