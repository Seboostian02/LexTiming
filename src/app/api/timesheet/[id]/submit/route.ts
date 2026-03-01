import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { messageResponse, handleApiError } from "@/lib/api-response";
import { submitForApproval } from "@/services/timesheet.service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await submitForApproval(user.userId, id);
    return messageResponse("Timesheet submitted for approval");
  } catch (err) {
    return handleApiError(err);
  }
}
