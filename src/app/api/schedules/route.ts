import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  successResponse,
  handleApiError,
} from "@/lib/api-response";
import { createScheduleSchema } from "@/schemas/schedule.schema";
import {
  getAllSchedules,
  createSchedule,
} from "@/services/schedule.service";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const data = await getAllSchedules();
    return successResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole("ADMIN");
    const body = await request.json();
    const validated = createScheduleSchema.parse(body);
    const data = await createSchedule(validated, user.userId);
    return successResponse(data, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
