import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError } from "@/lib/api-response";
import { updateTimesheetSchema } from "@/schemas/timesheet.schema";
import {
  getTimesheetDay,
  updateTimesheetDay,
} from "@/services/timesheet.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const data = await getTimesheetDay(user.userId, id);
    return successResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = updateTimesheetSchema.parse(body);
    const updated = await updateTimesheetDay(user.userId, id, validated);
    return successResponse(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
