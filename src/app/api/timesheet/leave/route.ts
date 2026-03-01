import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";
import { markLeaveDay, removeLeaveDay } from "@/services/timesheet.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole("MANAGER", "ADMIN");
    const body = await request.json();
    const { employeeId, dates, dayType, note } = body as {
      employeeId: string;
      dates: string[];
      dayType: "CO" | "CM";
      note?: string;
    };

    if (!employeeId || !dates?.length || !["CO", "CM"].includes(dayType)) {
      return errorResponse("Invalid request data", 400);
    }

    let created = 0;
    const errors: string[] = [];

    for (const dateStr of dates) {
      try {
        const date = new Date(dateStr + "T00:00:00.000Z");
        await markLeaveDay(user.userId, user.role, employeeId, date, dayType, note);
        created++;
      } catch (err) {
        errors.push(
          `${dateStr}: ${err instanceof Error ? err.message : "Failed"}`
        );
      }
    }

    return successResponse({ created, errors });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireRole("MANAGER", "ADMIN");
    const body = await request.json();
    const { timesheetDayId } = body as { timesheetDayId: string };

    if (!timesheetDayId) {
      return errorResponse("Missing timesheetDayId", 400);
    }

    await removeLeaveDay(user.userId, user.role, timesheetDayId);
    return successResponse({ removed: true });
  } catch (err) {
    return handleApiError(err);
  }
}
