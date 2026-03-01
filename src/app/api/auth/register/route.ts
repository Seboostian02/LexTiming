import { NextRequest } from "next/server";
import { register } from "@/services/auth.service";
import { registerSchema } from "@/schemas/auth.schema";
import { successResponse, handleApiError } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName } = registerSchema.parse(body);
    const result = await register(email, password, firstName, lastName);
    return successResponse(result.user, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
