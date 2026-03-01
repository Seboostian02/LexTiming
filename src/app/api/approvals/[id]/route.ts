import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { successResponse, handleApiError } from "@/lib/api-response";
import { ROLES } from "@/lib/constants";
import { processApprovalSchema } from "@/schemas/approval.schema";
import { processApproval } from "@/services/approval.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(ROLES.MANAGER, ROLES.ADMIN);
    const { id } = await params;
    const body = await request.json();
    const { decision, comment } = processApprovalSchema.parse(body);
    const result = await processApproval(user.userId, user.role, id, decision, comment);
    return successResponse(result);
  } catch (err) {
    return handleApiError(err);
  }
}
