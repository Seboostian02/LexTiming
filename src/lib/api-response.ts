import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    { success: true, data } satisfies ApiResponse<T>,
    { status }
  );
}

export function errorResponse(
  error: string,
  status = 400
): NextResponse {
  return NextResponse.json(
    { success: false, error } satisfies ApiResponse,
    { status }
  );
}

export function messageResponse(
  message: string,
  status = 200
): NextResponse {
  return NextResponse.json(
    { success: true, message } satisfies ApiResponse,
    { status }
  );
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof Error) {
    if (err.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    if (err.message === "Forbidden") {
      return errorResponse("Forbidden", 403);
    }
    return errorResponse(err.message, 400);
  }
  return errorResponse("Internal server error", 500);
}
