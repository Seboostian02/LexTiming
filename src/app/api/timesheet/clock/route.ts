import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError } from "@/lib/api-response";
import { clockActionSchema } from "@/schemas/timesheet.schema";
import {
  getTodayTimesheet,
  clockIn,
  clockPause,
  clockResume,
  clockStop,
} from "@/services/timesheet.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { action } = clockActionSchema.parse(body);

    switch (action) {
      case "START":
        await clockIn(user.userId);
        break;
      case "PAUSE":
        await clockPause(user.userId);
        break;
      case "RESUME":
        await clockResume(user.userId);
        break;
      case "STOP":
        await clockStop(user.userId);
        break;
    }

    const updated = await getTodayTimesheet(user.userId);
    return successResponse(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
