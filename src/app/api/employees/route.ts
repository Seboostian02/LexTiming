import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  successResponse,
  handleApiError,
} from "@/lib/api-response";
import { createEmployeeSchema } from "@/schemas/employee.schema";
import {
  getAllEmployees,
  createEmployee,
} from "@/services/employee.service";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const data = await getAllEmployees();
    return successResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole("ADMIN");
    const body = await request.json();
    const validated = createEmployeeSchema.parse(body);
    const data = await createEmployee(validated, user.userId);
    return successResponse(data, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
