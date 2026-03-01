import { NextRequest } from "next/server";
import { login } from "@/services/auth.service";
import { loginSchema } from "@/schemas/auth.schema";
import { successResponse, handleApiError } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);
    const result = await login(email, password);
    return successResponse(result.user);
  } catch (err) {
    return handleApiError(err);
  }
}
