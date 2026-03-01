import { logout } from "@/services/auth.service";
import { messageResponse, handleApiError } from "@/lib/api-response";

export async function POST() {
  try {
    await logout();
    return messageResponse("Logged out successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
