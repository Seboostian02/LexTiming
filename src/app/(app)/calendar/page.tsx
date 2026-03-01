"use client";

import { useState } from "react";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { DayDetailDialog } from "@/components/calendar/day-detail-dialog";
import { useCalendarData } from "@/hooks/use-timesheet";

export default function CalendarPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: calendarDays, isLoading } = useCalendarData(
    selectedYear,
    selectedMonth
  );

  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const handleDayClick = (date: string, timesheetId: string | null) => {
    setSelectedDayId(timesheetId);
    if (timesheetId) {
      setDialogOpen(true);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedDayId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Calendar</h1>

      <div className="rounded-lg border bg-card p-4 md:p-6">
        <MonthCalendar
          year={selectedYear}
          month={selectedMonth}
          calendarDays={calendarDays ?? []}
          isLoading={isLoading}
          onMonthChange={handleMonthChange}
          onDayClick={handleDayClick}
        />
      </div>

      <DayDetailDialog
        timesheetId={selectedDayId}
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
      />
    </div>
  );
}
