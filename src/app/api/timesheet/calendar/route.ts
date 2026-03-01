import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getCalendarData } from "@/services/timesheet.service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = request.nextUrl;
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const employeeId = searchParams.get("employeeId");

    if (!yearParam || !monthParam) {
      return errorResponse("Missing required query params: year and month", 400);
    }

    const year = parseInt(yearParam, 10);
    const month = parseInt(monthParam, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return errorResponse("Invalid year or month", 400);
    }

    if (employeeId && employeeId !== user.userId) {
      if (user.role !== "MANAGER" && user.role !== "ADMIN") {
        return errorResponse("Not authorized to view other employees' calendars", 403);
      }
    }

    const targetId = employeeId ?? user.userId;
    const data = await getCalendarData(targetId, year, month);
    return successResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}
