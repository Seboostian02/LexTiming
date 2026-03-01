import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";
import { getMonthlyReport } from "@/services/report.service";

export async function GET(request: NextRequest) {
  try {
    await requireRole("ADMIN");

    const { searchParams } = request.nextUrl;
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    if (!yearParam || !monthParam) {
      return errorResponse("Missing required query params: year and month", 400);
    }

    const year = parseInt(yearParam, 10);
    const month = parseInt(monthParam, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return errorResponse("Invalid year or month", 400);
    }

    const data = await getMonthlyReport(year, month);
    return successResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}
