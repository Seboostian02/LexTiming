import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  type JWTPayload,
} from "@/lib/auth";

interface LoginResult {
  user: JWTPayload;
  token: string;
}

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  const employee = await prisma.employee.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!employee) {
    throw new Error("Invalid email or password");
  }

  if (employee.status !== "ACTIVE") {
    throw new Error("Account is inactive");
  }

  const valid = await verifyPassword(password, employee.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  const payload: JWTPayload = {
    userId: employee.id,
    email: employee.email,
    role: employee.role,
    firstName: employee.firstName,
    lastName: employee.lastName,
  };

  const token = await signToken(payload);
  await setAuthCookie(token);

  return { user: payload, token };
}

export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<LoginResult> {
  const existing = await prisma.employee.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await hashPassword(password);

  const employee = await prisma.employee.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      role: "EMPLOYEE",
    },
  });

  const payload: JWTPayload = {
    userId: employee.id,
    email: employee.email,
    role: employee.role,
    firstName: employee.firstName,
    lastName: employee.lastName,
  };

  const token = await signToken(payload);
  await setAuthCookie(token);

  return { user: payload, token };
}

export async function logout(): Promise<void> {
  await clearAuthCookie();
}

export async function getCurrentUser(
  userId: string
): Promise<JWTPayload | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: userId },
  });

  if (!employee || employee.status !== "ACTIVE") {
    return null;
  }

  return {
    userId: employee.id,
    email: employee.email,
    role: employee.role,
    firstName: employee.firstName,
    lastName: employee.lastName,
  };
}
