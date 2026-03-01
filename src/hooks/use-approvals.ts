import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApprovalItem, ApprovalRequest, ApiResponse } from "@/types/api";

export function usePendingApprovals() {
  return useQuery<ApprovalItem[]>({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const res = await fetch("/api/approvals");
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to fetch pending approvals");
      }
      const data: ApiResponse<ApprovalItem[]> = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch pending approvals");
      return data.data ?? [];
    },
  });
}

export function useProcessApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: { id: string } & ApprovalRequest) => {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to process approval");
      }
      const data: ApiResponse = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to process approval");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}
