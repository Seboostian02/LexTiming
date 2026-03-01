"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Clock, Coffee, Timer } from "lucide-react";
import { useTodayTimesheet } from "@/hooks/use-timesheet";

function formatMinutes(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

function getTotalBreakMinutes(breaks: { start: string; end?: string }[]): number {
  const totalMs = breaks.reduce((acc, b) => {
    const start = new Date(b.start).getTime();
    const end = b.end ? new Date(b.end).getTime() : Date.now();
    return acc + (end - start);
  }, 0);
  return totalMs / 60000;
}

export function DaySummary() {
  const { data: timesheet, isLoading } = useTodayTimesheet();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const startTimeFormatted = timesheet?.startTime
    ? new Date(timesheet.startTime).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  const breakMinutes = timesheet?.breaks?.length
    ? getTotalBreakMinutes(timesheet.breaks)
    : 0;

  const totalWorked = timesheet?.totalMinutes ?? timesheet?.elapsedMinutes ?? 0;

  const summaryItems = [
    {
      label: "Start Time",
      value: startTimeFormatted,
      icon: Clock,
      iconColor: "text-blue-500",
    },
    {
      label: "Break Time",
      value: breakMinutes > 0 ? formatMinutes(breakMinutes) : "--",
      icon: Coffee,
      iconColor: "text-yellow-500",
    },
    {
      label: "Total Worked",
      value: totalWorked > 0 ? formatMinutes(totalWorked) : "--",
      icon: Timer,
      iconColor: "text-green-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {summaryItems.map((item) => (
        <Card key={item.label}>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className={`rounded-lg bg-muted p-2.5 ${item.iconColor}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="text-xl font-semibold">{item.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
