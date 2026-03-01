import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { MonthReportRow, ApiResponse } from "@/types/api";
import type { CloseValidation } from "@/services/report.service";

export function useMonthlyReport(year: number, month: number) {
  return useQuery<MonthReportRow[]>({
    queryKey: ["monthly-report", year, month],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/report?year=${year}&month=${month}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch monthly report");
      }
      const json: ApiResponse<MonthReportRow[]> = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to fetch monthly report");
      }
      return json.data ?? [];
    },
  });
}

// Month Close Validation

export function useMonthCloseValidation(year: number, month: number) {
  return useQuery<CloseValidation>({
    queryKey: ["month-close-validation", year, month],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/close-month?year=${year}&month=${month}`
      );
      const json: ApiResponse<CloseValidation> = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to get validation");
      }
      return json.data as CloseValidation;
    },
    enabled: year > 0 && month > 0,
  });
}

// Close Month Mutation

interface CloseMonthRequest {
  year: number;
  month: number;
  force?: boolean;
}

interface CloseMonthResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export function useCloseMonth() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, CloseMonthRequest>({
    mutationFn: async ({ year, month, force }: CloseMonthRequest) => {
      const res = await fetch("/api/admin/close-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, force }),
      });
      const json: CloseMonthResponse = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to close month");
      }
      return json.message || "Month closed successfully";
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-report"] });
      queryClient.invalidateQueries({
        queryKey: ["month-close-validation"],
      });
    },
  });
}
