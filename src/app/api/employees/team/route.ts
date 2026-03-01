import { requireRole } from "@/lib/auth";
import { successResponse, handleApiError } from "@/lib/api-response";
import { ROLES } from "@/lib/constants";
import { getTeamMembers } from "@/services/approval.service";

export async function GET() {
  try {
    const user = await requireRole(ROLES.MANAGER, ROLES.ADMIN);
    const teamMembers = await getTeamMembers(user.userId, user.role);
    return successResponse(teamMembers);
  } catch (err) {
    return handleApiError(err);
  }
}
