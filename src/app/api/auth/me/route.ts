import { getAuthUser } from "@/lib/auth";
import { getCurrentUser } from "@/services/auth.service";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return errorResponse("Not authenticated", 401);
    }

    const user = await getCurrentUser(authUser.userId);
    if (!user) {
      return errorResponse("User not found", 401);
    }

    return successResponse(user);
  } catch (err) {
    return handleApiError(err);
  }
}
