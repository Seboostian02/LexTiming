import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { successResponse, handleApiError } from "@/lib/api-response";
import { getAuditLogs, getAuditActors } from "@/services/audit.service";

export async function GET(request: NextRequest) {
  try {
    await requireRole("ADMIN");
    const { searchParams } = request.nextUrl;

    if (searchParams.get("actors") === "true") {
      const actors = await getAuditActors();
      return successResponse(actors);
    }

    const filters = {
      entity: searchParams.get("entity") || undefined,
      action: searchParams.get("action") || undefined,
      actorId: searchParams.get("actorId") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      page: searchParams.get("page")
        ? parseInt(searchParams.get("page")!, 10)
        : undefined,
      pageSize: searchParams.get("pageSize")
        ? parseInt(searchParams.get("pageSize")!, 10)
        : undefined,
    };

    const data = await getAuditLogs(filters);
    return successResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}
