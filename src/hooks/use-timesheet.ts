import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  TodayTimesheet,
  ClockActionRequest,
  CalendarDay,
  TimesheetDayDetail,
  UpdateTimesheetRequest,
  EmployeeAlert,
} from "@/types/timesheet";
import type { ApiResponse } from "@/types/api";

export function useTodayTimesheet() {
  return useQuery<TodayTimesheet | null>({
    queryKey: ["today-timesheet"],
    queryFn: async () => {
      const res = await fetch("/api/timesheet/today");
      if (!res.ok) {
        throw new Error("Failed to fetch today's timesheet");
      }
      const json: ApiResponse<TodayTimesheet> = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to fetch today's timesheet");
      }
      return json.data ?? null;
    },
    refetchInterval: 30000,
  });
}

export function useClockAction() {
  const queryClient = useQueryClient();

  return useMutation<TodayTimesheet, Error, ClockActionRequest>({
    mutationFn: async (body: ClockActionRequest) => {
      const res = await fetch("/api/timesheet/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Clock action failed");
      }
      const json: ApiResponse<TodayTimesheet> = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Clock action failed");
      }
      return json.data as TodayTimesheet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-timesheet"] });
    },
  });
}

export function useCalendarData(year: number, month: number, employeeId?: string) {
  return useQuery<CalendarDay[]>({
    queryKey: ["calendar", year, month, employeeId ?? "self"],
    queryFn: async () => {
      let url = `/api/timesheet/calendar?year=${year}&month=${month}`;
      if (employeeId) url += `&employeeId=${employeeId}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to fetch calendar data");
      }
      const json: ApiResponse<CalendarDay[]> = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to fetch calendar data");
      }
      return json.data ?? [];
    },
  });
}

export function useSubmitTimesheet() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/timesheet/${id}/submit`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to submit timesheet");
      }
      const json: ApiResponse = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to submit timesheet");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["today-timesheet"] });
    },
  });
}

export function useTimesheetDay(id: string | null) {
  return useQuery<TimesheetDayDetail | null>({
    queryKey: ["timesheet-day", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/timesheet/${id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch timesheet day");
      }
      const json: ApiResponse<TimesheetDayDetail> = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to fetch timesheet day");
      }
      return json.data ?? null;
    },
    enabled: id !== null,
  });
}

export function useUpdateTimesheet() {
  const queryClient = useQueryClient();

  return useMutation<
    TodayTimesheet,
    Error,
    { id: string; data: UpdateTimesheetRequest }
  >({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(`/api/timesheet/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to update timesheet");
      }
      const json: ApiResponse<TodayTimesheet> = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to update timesheet");
      }
      return json.data as TodayTimesheet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["timesheet-day"] });
    },
  });
}

export function useMarkLeave() {
  const queryClient = useQueryClient();
  return useMutation<
    { created: number; errors: string[] },
    Error,
    { employeeId: string; dates: string[]; dayType: "CO" | "CM"; note?: string }
  >({
    mutationFn: async (data) => {
      const res = await fetch("/api/timesheet/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json: ApiResponse<{ created: number; errors: string[] }> =
        await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to mark leave");
      if (!json.success) throw new Error(json.error || "Failed to mark leave");
      return json.data as { created: number; errors: string[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}

export function useRemoveLeave() {
  const queryClient = useQueryClient();
  return useMutation<{ removed: boolean }, Error, string>({
    mutationFn: async (timesheetDayId) => {
      const res = await fetch("/api/timesheet/leave", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timesheetDayId }),
      });
      const json: ApiResponse<{ removed: boolean }> = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to remove leave");
      if (!json.success) throw new Error(json.error || "Failed to remove leave");
      return json.data as { removed: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}

export function useAlerts() {
  return useQuery<EmployeeAlert[]>({
    queryKey: ["alerts"],
    queryFn: async () => {
      const res = await fetch("/api/timesheet/alerts");
      const json: ApiResponse<EmployeeAlert[]> = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch alerts");
      if (!json.success) throw new Error(json.error || "Failed to fetch alerts");
      return json.data ?? [];
    },
    refetchInterval: 60000,
  });
}
