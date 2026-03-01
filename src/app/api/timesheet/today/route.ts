import { requireAuth } from "@/lib/auth";
import { successResponse, handleApiError } from "@/lib/api-response";
import { getTodayTimesheet } from "@/services/timesheet.service";

export async function GET() {
  try {
    const user = await requireAuth();
    const today = await getTodayTimesheet(user.userId);
    return successResponse(today);
  } catch (err) {
    return handleApiError(err);
  }
}
