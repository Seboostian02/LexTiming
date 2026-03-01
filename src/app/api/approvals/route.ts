import { requireRole } from "@/lib/auth";
import { successResponse, handleApiError } from "@/lib/api-response";
import { ROLES } from "@/lib/constants";
import { getPendingApprovals } from "@/services/approval.service";

export async function GET() {
  try {
    const user = await requireRole(ROLES.MANAGER, ROLES.ADMIN);
    const approvals = await getPendingApprovals(user.userId, user.role);
    return successResponse(approvals);
  } catch (err) {
    return handleApiError(err);
  }
}
