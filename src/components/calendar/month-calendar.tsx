"use client";

import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  getDay,
  format,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isWeekend,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarDay } from "@/types/timesheet";
import type { DayStatus, DayType } from "@/lib/constants";

interface MonthCalendarProps {
  year: number;
  month: number; // 1-indexed
  calendarDays: CalendarDay[];
  isLoading: boolean;
  onMonthChange: (year: number, month: number) => void;
  onDayClick: (date: string, timesheetId: string | null) => void;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getStatusColor(
  status: DayStatus | null,
  dayType: DayType | null,
  isWeekendDay: boolean
): string {
  if (isWeekendDay) return "bg-gray-50 dark:bg-gray-900/30";

  if (dayType === "CO" || dayType === "CM" || dayType === "HOLIDAY") {
    return "bg-yellow-100 dark:bg-yellow-900/30";
  }

  switch (status) {
    case "APPROVED":
      return "bg-green-100 dark:bg-green-900/30";
    case "SUBMITTED":
      return "bg-blue-100 dark:bg-blue-900/30";
    case "DRAFT":
      return "bg-gray-100 dark:bg-gray-800/50";
    case "REJECTED":
      return "bg-red-100 dark:bg-red-900/30";
    case "LOCKED":
      return "bg-gray-300 dark:bg-gray-700/50";
    default:
      return "bg-white dark:bg-background";
  }
}

function getStatusTextColor(
  status: DayStatus | null,
  dayType: DayType | null,
  isWeekendDay: boolean
): string {
  if (isWeekendDay) return "text-gray-400 dark:text-gray-600";

  if (dayType === "CO" || dayType === "CM" || dayType === "HOLIDAY") {
    return "text-yellow-700 dark:text-yellow-400";
  }

  switch (status) {
    case "APPROVED":
      return "text-green-700 dark:text-green-400";
    case "SUBMITTED":
      return "text-blue-700 dark:text-blue-400";
    case "DRAFT":
      return "text-gray-600 dark:text-gray-400";
    case "REJECTED":
      return "text-red-700 dark:text-red-400";
    case "LOCKED":
      return "text-gray-600 dark:text-gray-400";
    default:
      return "text-foreground";
  }
}

function formatHours(totalMinutes: number | null): string {
  if (totalMinutes === null || totalMinutes === 0) return "";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}m`;
}

function getDayTypeLabel(dayType: DayType): string {
  switch (dayType) {
    case "CO":
      return "CO";
    case "CM":
      return "CM";
    case "HOLIDAY":
      return "Holiday";
    default:
      return "";
  }
}

export function MonthCalendar({
  year,
  month,
  calendarDays,
  isLoading,
  onMonthChange,
  onDayClick,
}: MonthCalendarProps) {
  const currentDate = useMemo(
    () => new Date(year, month - 1, 1),
    [year, month]
  );

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // getDay returns 0=Sun, 1=Mon, ..., 6=Sat
  // We need Monday=0, so transform: (getDay(date) + 6) % 7
  const startDayOfWeek = useMemo(() => {
    const first = startOfMonth(currentDate);
    return (getDay(first) + 6) % 7;
  }, [currentDate]);

  // Build a lookup map from date string (YYYY-MM-DD) to CalendarDay
  const dayMap = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    for (const day of calendarDays) {
      // The API returns ISO dates, extract YYYY-MM-DD
      const dateKey = day.date.substring(0, 10);
      map.set(dateKey, day);
    }
    return map;
  }, [calendarDays]);

  const handlePrevMonth = () => {
    const prev = subMonths(currentDate, 1);
    onMonthChange(prev.getFullYear(), prev.getMonth() + 1);
  };

  const handleNextMonth = () => {
    const next = addMonths(currentDate, 1);
    onMonthChange(next.getFullYear(), next.getMonth() + 1);
  };

  const handleDayClick = (day: Date) => {
    if (isWeekend(day)) return;
    const dateKey = format(day, "yyyy-MM-dd");
    const calendarDay = dayMap.get(dateKey);
    onDayClick(dateKey, calendarDay?.id ?? null);
  };

  // Create empty cells for padding before the first day
  const paddingCells = Array.from({ length: startDayOfWeek }, (_, i) => (
    <div key={`pad-${i}`} className="min-h-[72px]" />
  ));

  return (
    <div className="space-y-4">
      {/* Month/Year navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={handlePrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <Button variant="outline" size="icon" onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {paddingCells}
        {daysInMonth.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const calendarDay = dayMap.get(dateKey);
          const weekendDay = isWeekend(day);
          const today = isToday(day);
          const status = (calendarDay?.status as DayStatus) ?? null;
          const dayType = (calendarDay?.dayType as DayType) ?? null;
          const anomalies = calendarDay?.anomalies ?? [];
          const hasRedAnomaly =
            anomalies.includes("MISSING_END") ||
            anomalies.includes("MISSING_DAY");
          const hasAmberAnomaly =
            anomalies.includes("UNDER_HOURS") ||
            anomalies.includes("OVER_HOURS") ||
            anomalies.includes("EARLY_START") ||
            anomalies.includes("LATE_END");

          const bgColor = getStatusColor(status, dayType, weekendDay);
          const textColor = getStatusTextColor(status, dayType, weekendDay);
          const isLeaveType =
            dayType === "CO" || dayType === "CM" || dayType === "HOLIDAY";

          return (
            <button
              key={dateKey}
              type="button"
              disabled={weekendDay}
              onClick={() => handleDayClick(day)}
              className={cn(
                "relative min-h-[72px] rounded-md p-1.5 text-left transition-all",
                bgColor,
                !weekendDay && "hover:ring-2 hover:ring-primary/40 cursor-pointer",
                weekendDay && "cursor-default",
                today && "ring-2 ring-primary"
              )}
            >
              {/* Day number */}
              <div
                className={cn(
                  "text-sm font-medium",
                  today
                    ? "text-primary font-bold"
                    : weekendDay
                    ? "text-muted-foreground/50"
                    : "text-foreground"
                )}
              >
                {format(day, "d")}
              </div>

              {/* Status info */}
              {!weekendDay && calendarDay && (
                <div className="mt-0.5">
                  {isLeaveType ? (
                    <span
                      className={cn("text-[10px] font-semibold", textColor)}
                    >
                      {getDayTypeLabel(dayType!)}
                    </span>
                  ) : (
                    <span className={cn("text-[10px] font-medium", textColor)}>
                      {formatHours(calendarDay.totalMinutes)}
                    </span>
                  )}
                </div>
              )}

              {/* Anomaly indicators, one line per anomaly */}
              {(hasRedAnomaly || hasAmberAnomaly) && (
                <div className="mt-0.5 space-y-px">
                  {anomalies.map((a) => {
                    const isRed = a === "MISSING_END" || a === "MISSING_DAY";
                    const label =
                      a === "MISSING_END" ? "Fara Stop"
                      : a === "MISSING_DAY" ? "Lipsa pontaj"
                      : a === "EARLY_START" ? "Start devreme"
                      : a === "LATE_END" ? "Stop tarziu"
                      : a === "UNDER_HOURS" ? "Ore putine"
                      : "Ore excesive";
                    return (
                      <div key={a} className="flex items-center gap-0.5">
                        <div className={cn("h-1.5 w-1.5 shrink-0 rounded-full", isRed ? "bg-red-500" : "bg-amber-500")} />
                        <span className={cn("text-[8px] font-medium leading-tight truncate", isRed ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2 border-t">
        <LegendItem color="bg-green-100 dark:bg-green-900/30" label="Approved" />
        <LegendItem color="bg-blue-100 dark:bg-blue-900/30" label="Submitted" />
        <LegendItem color="bg-gray-100 dark:bg-gray-800/50" label="Draft" />
        <LegendItem color="bg-red-100 dark:bg-red-900/30" label="Rejected" />
        <LegendItem color="bg-gray-300 dark:bg-gray-700/50" label="Locked" />
        <LegendItem
          color="bg-yellow-100 dark:bg-yellow-900/30"
          label="Leave / Holiday"
        />
        <LegendItem
          color="bg-gray-50 dark:bg-gray-900/30"
          label="Weekend"
        />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span>Lipsa pontaj / Zi fara Stop</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span>Ore insuficiente / excesive</span>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <div className={cn("h-3 w-3 rounded-sm border", color)} />
      <span>{label}</span>
    </div>
  );
}
