import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError } from "@/lib/api-response";
import { getEmployeeAlerts } from "@/services/timesheet.service";

export async function GET() {
  try {
    const user = await requireAuth();
    const alerts = await getEmployeeAlerts(user.userId);
    return successResponse(alerts);
  } catch (err) {
    return handleApiError(err);
  }
}
