"use client";

import { useAlerts } from "@/hooks/use-timesheet";
import { AlertTriangle, XCircle } from "lucide-react";
import Link from "next/link";

export function AlertBanner() {
  const { data: alerts } = useAlerts();

  if (!alerts?.length) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div
          key={`${alert.type}-${i}`}
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
            alert.severity === "critical"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
          }`}
        >
          {alert.severity === "critical" ? (
            <XCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span className="flex-1">{alert.message}</span>
          {alert.type === "REJECTED_DAYS" && (
            <Link
              href="/calendar"
              className="text-xs font-medium underline underline-offset-2 shrink-0"
            >
              Vezi calendar
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
