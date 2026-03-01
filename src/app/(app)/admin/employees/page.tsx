"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { EmployeeTable } from "@/components/admin/employee-table";
import { EmployeeForm } from "@/components/admin/employee-form";
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from "@/hooks/use-employees";
import type { Employee } from "@/types/employee";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "@/schemas/employee.schema";

export default function EmployeesPage() {
  const { data: employees = [], isLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setFormOpen(true);
  };

  const handleEditEmployee = useCallback((employee: Employee) => {
    setEditingEmployee(employee);
    setFormOpen(true);
  }, []);

  const handleToggleStatus = useCallback(
    (employee: Employee) => {
      if (employee.status === "ACTIVE") {
        deleteEmployee.mutate(employee.id);
      } else {
        updateEmployee.mutate({
          id: employee.id,
          data: { status: "ACTIVE" },
        });
      }
    },
    [deleteEmployee, updateEmployee]
  );

  const handleFormSubmit = (data: CreateEmployeeInput | UpdateEmployeeInput) => {
    if (editingEmployee) {
      updateEmployee.mutate(
        { id: editingEmployee.id, data: data as UpdateEmployeeInput },
        {
          onSuccess: () => {
            setFormOpen(false);
            setEditingEmployee(null);
          },
        }
      );
    } else {
      createEmployee.mutate(data as CreateEmployeeInput, {
        onSuccess: () => {
          setFormOpen(false);
        },
      });
    }
  };

  const isPending = editingEmployee
    ? updateEmployee.isPending
    : createEmployee.isPending;

  const error = editingEmployee
    ? updateEmployee.error
    : createEmployee.error;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employee Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage all employees, their roles, and assignments.
          </p>
        </div>
        <Button onClick={handleAddEmployee} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      <EmployeeTable
        employees={employees}
        onEdit={handleEditEmployee}
        onToggleStatus={handleToggleStatus}
        isLoading={isLoading}
      />

      <EmployeeForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingEmployee(null);
        }}
        employee={editingEmployee}
        onSubmit={handleFormSubmit}
        isPending={isPending}
        error={error}
      />
    </div>
  );
}
