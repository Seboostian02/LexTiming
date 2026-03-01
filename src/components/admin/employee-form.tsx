"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
} from "@/schemas/employee.schema";
import { useManagers } from "@/hooks/use-employees";
import { useSchedules } from "@/hooks/use-schedules";
import type { Employee } from "@/types/employee";

interface EmployeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onSubmit: (data: CreateEmployeeInput | UpdateEmployeeInput) => void;
  isPending: boolean;
  error: Error | null;
}

const NONE_VALUE = "__none__";

function CreateEmployeeFields({
  onSubmit,
  isPending,
  error,
  onCancel,
}: {
  onSubmit: (data: CreateEmployeeInput) => void;
  isPending: boolean;
  error: Error | null;
  onCancel: () => void;
}) {
  const { data: managers = [] } = useManagers();
  const { data: schedules = [] } = useSchedules();

  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "EMPLOYEE",
      department: "",
      hoursPerDay: 8,
      managerId: undefined,
      scheduleId: undefined,
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="employee@company.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Minimum 6 characters"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" placeholder="John" {...register("firstName")} />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" placeholder="Doe" {...register("lastName")} />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select

              value={watch("role")}
              onValueChange={(value) =>
                setValue("role", value as "EMPLOYEE" | "MANAGER" | "ADMIN", {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMPLOYEE">Employee</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input id="department" placeholder="Engineering" {...register("department")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hoursPerDay">Hours Per Day</Label>
          <Input
            id="hoursPerDay"
            type="number"
            min={1}
            max={24}
            step={0.5}
            {...register("hoursPerDay", { valueAsNumber: true })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Manager</Label>
            <Select
              value={watch("managerId") ?? NONE_VALUE}
              onValueChange={(value) =>
                setValue("managerId", value === NONE_VALUE ? undefined : value, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} ({m.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Schedule</Label>
            <Select
              value={watch("scheduleId") ?? NONE_VALUE}
              onValueChange={(value) =>
                setValue("scheduleId", value === NONE_VALUE ? undefined : value, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select schedule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None</SelectItem>
                {schedules.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error.message}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Employee
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditEmployeeFields({
  employee,
  onSubmit,
  isPending,
  error,
  onCancel,
}: {
  employee: Employee;
  onSubmit: (data: UpdateEmployeeInput) => void;
  isPending: boolean;
  error: Error | null;
  onCancel: () => void;
}) {
  const { data: managers = [] } = useManagers();
  const { data: schedules = [] } = useSchedules();

  const form = useForm<UpdateEmployeeInput>({
    resolver: zodResolver(updateEmployeeSchema),
    defaultValues: {
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.role,
      department: employee.department ?? "",
      hoursPerDay: employee.hoursPerDay,
      managerId: employee.managerId ?? undefined,
      scheduleId: employee.scheduleId ?? undefined,
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = form;

  useEffect(() => {
    reset({
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.role,
      department: employee.department ?? "",
      hoursPerDay: employee.hoursPerDay,
      managerId: employee.managerId ?? undefined,
      scheduleId: employee.scheduleId ?? undefined,
    });
  }, [employee, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-firstName">First Name</Label>
            <Input id="edit-firstName" placeholder="John" {...register("firstName")} />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-lastName">Last Name</Label>
            <Input id="edit-lastName" placeholder="Doe" {...register("lastName")} />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select

              value={watch("role") ?? "EMPLOYEE"}
              onValueChange={(value) =>
                setValue("role", value as "EMPLOYEE" | "MANAGER" | "ADMIN", {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMPLOYEE">Employee</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-department">Department</Label>
            <Input
              id="edit-department"
              placeholder="Engineering"
              {...register("department")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-hoursPerDay">Hours Per Day</Label>
          <Input
            id="edit-hoursPerDay"
            type="number"
            min={1}
            max={24}
            step={0.5}
            {...register("hoursPerDay", { valueAsNumber: true })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Manager</Label>
            <Select
              value={watch("managerId") ?? NONE_VALUE}
              onValueChange={(value) =>
                setValue(
                  "managerId",
                  value === NONE_VALUE ? null : value,
                  { shouldValidate: true }
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} ({m.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Schedule</Label>
            <Select
              value={watch("scheduleId") ?? NONE_VALUE}
              onValueChange={(value) =>
                setValue(
                  "scheduleId",
                  value === NONE_VALUE ? null : value,
                  { shouldValidate: true }
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select schedule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None</SelectItem>
                {schedules.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error.message}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EmployeeForm({
  open,
  onOpenChange,
  employee,
  onSubmit,
  isPending,
  error,
}: EmployeeFormProps) {
  const isEdit = employee !== null;

  const handleCancel = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Employee" : "Add Employee"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the employee's details below."
              : "Fill in the details to create a new employee."}
          </DialogDescription>
        </DialogHeader>

        {isEdit && employee ? (
          <EditEmployeeFields
            employee={employee}
            onSubmit={(data) => onSubmit(data)}
            isPending={isPending}
            error={error}
            onCancel={handleCancel}
          />
        ) : (
          <CreateEmployeeFields
            onSubmit={(data) => onSubmit(data)}
            isPending={isPending}
            error={error}
            onCancel={handleCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
