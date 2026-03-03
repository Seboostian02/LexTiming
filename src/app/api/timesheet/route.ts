import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError } from "@/lib/api-response";
import { manualTimesheetSchema } from "@/schemas/timesheet.schema";
import { createManualTimesheetDay } from "@/services/timesheet.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { date, startTime, endTime, note } = manualTimesheetSchema.parse(body);

    const result = await createManualTimesheetDay(
      user.userId,
      date,
      startTime,
      endTime,
      note
    );

    return successResponse(result, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
