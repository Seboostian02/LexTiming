import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";

interface ProfileManager {
  id: string;
  firstName: string;
  lastName: string;
}

interface ProfileSchedule {
  id: string;
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  minHoursPerDay: number;
  breakMinutes: number;
}

export interface ProfileData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string | null;
  hoursPerDay: number;
  status: string;
  manager: ProfileManager | null;
  schedule: ProfileSchedule | null;
  createdAt: string;
}

export function useProfile() {
  return useQuery<ProfileData>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to fetch profile");
      }
      const data: ApiResponse<ProfileData> = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch profile");
      return data.data as ProfileData;
    },
  });
}
