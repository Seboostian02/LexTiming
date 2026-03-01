import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Schedule, ApiResponse } from "@/types/api";

interface CreateScheduleRequest {
  name: string;
  type?: string;
  startTime: string;
  endTime: string;
  minHoursPerDay?: number;
  breakMinutes?: number;
}

interface UpdateScheduleRequest {
  name?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
  minHoursPerDay?: number;
  breakMinutes?: number;
}

export function useSchedules() {
  return useQuery<Schedule[]>({
    queryKey: ["schedules"],
    queryFn: async () => {
      const res = await fetch("/api/schedules");
      if (!res.ok) {
        throw new Error("Failed to fetch schedules");
      }
      const json: ApiResponse<Schedule[]> = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to fetch schedules");
      }
      return json.data ?? [];
    },
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation<Schedule, Error, CreateScheduleRequest>({
    mutationFn: async (data: CreateScheduleRequest) => {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json: ApiResponse<Schedule> = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create schedule");
      }
      return json.data as Schedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation<Schedule, Error, { id: string; data: UpdateScheduleRequest }>({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(`/api/schedules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json: ApiResponse<Schedule> = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update schedule");
      }
      return json.data as Schedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/schedules/${id}`, {
        method: "DELETE",
      });
      const json: ApiResponse = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete schedule");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
  });
}
