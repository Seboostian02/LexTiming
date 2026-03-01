import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  successResponse,
  messageResponse,
  handleApiError,
} from "@/lib/api-response";
import { updateScheduleSchema } from "@/schemas/schedule.schema";
import {
  getSchedule,
  updateSchedule,
  deleteSchedule,
} from "@/services/schedule.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;
    const data = await getSchedule(id);
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
    const user = await requireRole("ADMIN");
    const { id } = await params;
    const body = await request.json();
    const validated = updateScheduleSchema.parse(body);
    const data = await updateSchedule(id, validated, user.userId);
    return successResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("ADMIN");
    const { id } = await params;
    await deleteSchedule(id, user.userId);
    return messageResponse("Schedule deleted successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
