import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  successResponse,
  messageResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";
import {
  closeMonth,
  getMonthCloseValidation,
} from "@/services/report.service";

export async function GET(request: NextRequest) {
  try {
    await requireRole("ADMIN");

    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));

    if (!year || !month || month < 1 || month > 12) {
      return errorResponse("Invalid year or month", 400);
    }

    const validation = await getMonthCloseValidation(year, month);
    return successResponse(validation);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole("ADMIN");

    const body = await request.json();
    const { year, month, force } = body as {
      year: number;
      month: number;
      force?: boolean;
    };

    if (!year || !month || month < 1 || month > 12) {
      return errorResponse("Invalid year or month", 400);
    }

    const count = await closeMonth(year, month, force, user.userId);
    return messageResponse(`Month closed. ${count} entries locked.`);
  } catch (err) {
    return handleApiError(err);
  }
}
