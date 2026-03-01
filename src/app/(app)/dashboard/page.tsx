"use client";

import { useAuth } from "@/context/auth-context";
import { AlertBanner } from "@/components/dashboard/alert-banner";
import { ClockWidget } from "@/components/dashboard/clock-widget";
import { DaySummary } from "@/components/dashboard/day-summary";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.firstName}!
        </p>
      </div>

      <AlertBanner />

      <ClockWidget />

      <DaySummary />
    </div>
  );
}
