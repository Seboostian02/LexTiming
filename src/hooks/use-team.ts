import { useQuery } from "@tanstack/react-query";
import type { TeamMember } from "@/types/employee";
import type { ApiResponse } from "@/types/api";

export function useTeamMembers() {
  return useQuery<TeamMember[]>({
    queryKey: ["team-members"],
    queryFn: async () => {
      const res = await fetch("/api/employees/team");
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to fetch team members");
      }
      const data: ApiResponse<TeamMember[]> = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch team members");
      return data.data ?? [];
    },
    refetchInterval: 30000, // refresh every 30s for live status
  });
}
