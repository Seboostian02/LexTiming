"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { useCalendarData } from "@/hooks/use-timesheet";

interface EmployeeCalendarDialogProps {
  employee: { id: string; firstName: string; lastName: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeCalendarDialog({
  employee,
  open,
  onOpenChange,
}: EmployeeCalendarDialogProps) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);

  const { data: calendarDays, isLoading } = useCalendarData(
    year,
    month,
    employee?.id
  );

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Calendar &mdash; {employee?.firstName} {employee?.lastName}
          </DialogTitle>
        </DialogHeader>
        {employee && (
          <MonthCalendar
            year={year}
            month={month}
            calendarDays={calendarDays ?? []}
            isLoading={isLoading}
            onMonthChange={handleMonthChange}
            onDayClick={() => {}}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
