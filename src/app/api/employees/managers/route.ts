import { requireRole } from "@/lib/auth";
import { successResponse, handleApiError } from "@/lib/api-response";
import { getManagers } from "@/services/employee.service";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const data = await getManagers();
    return successResponse(data);
  } catch (err) {
    return handleApiError(err);
  }
}
