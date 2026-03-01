import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Employee, CreateEmployeeRequest, UpdateEmployeeRequest } from "@/types/employee";
import type { ApiResponse } from "@/types/api";

export function useEmployees() {
  return useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await fetch("/api/employees");
      if (!res.ok) {
        throw new Error("Failed to fetch employees");
      }
      const json: ApiResponse<Employee[]> = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to fetch employees");
      }
      return json.data ?? [];
    },
  });
}

export function useEmployee(id: string | null) {
  return useQuery<Employee | null>({
    queryKey: ["employee", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/employees/${id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch employee");
      }
      const json: ApiResponse<Employee> = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to fetch employee");
      }
      return json.data ?? null;
    },
    enabled: id !== null,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation<Employee, Error, CreateEmployeeRequest>({
    mutationFn: async (data: CreateEmployeeRequest) => {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json: ApiResponse<Employee> = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create employee");
      }
      return json.data as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation<Employee, Error, { id: string; data: UpdateEmployeeRequest }>({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json: ApiResponse<Employee> = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update employee");
      }
      return json.data as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
      });
      const json: ApiResponse = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete employee");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

interface ManagerOption {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export function useManagers() {
  return useQuery<ManagerOption[]>({
    queryKey: ["managers"],
    queryFn: async () => {
      const res = await fetch("/api/employees/managers");
      if (!res.ok) {
        throw new Error("Failed to fetch managers");
      }
      const json: ApiResponse<ManagerOption[]> = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to fetch managers");
      }
      return json.data ?? [];
    },
  });
}
