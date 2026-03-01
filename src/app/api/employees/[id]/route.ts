import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  successResponse,
  messageResponse,
  handleApiError,
} from "@/lib/api-response";
import { updateEmployeeSchema } from "@/schemas/employee.schema";
import {
  getEmployee,
  updateEmployee,
  deleteEmployee,
} from "@/services/employee.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;
    const data = await getEmployee(id);
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
    const validated = updateEmployeeSchema.parse(body);
    const data = await updateEmployee(id, validated, user.userId);
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
    await deleteEmployee(id, user.userId);
    return messageResponse("Employee deactivated successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
