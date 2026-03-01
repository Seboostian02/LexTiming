import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await requireAuth();

    const employee = await prisma.employee.findUnique({
      where: { id: user.userId },
      include: {
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
        schedule: {
          select: {
            id: true,
            name: true,
            type: true,
            startTime: true,
            endTime: true,
            minHoursPerDay: true,
            breakMinutes: true,
          },
        },
      },
    });

    if (!employee) {
      return errorResponse("Employee not found", 404);
    }

    return successResponse({
      userId: employee.id,
      email: employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.role,
      department: employee.department,
      hoursPerDay: employee.hoursPerDay,
      status: employee.status,
      manager: employee.manager,
      schedule: employee.schedule,
      createdAt: employee.createdAt.toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
