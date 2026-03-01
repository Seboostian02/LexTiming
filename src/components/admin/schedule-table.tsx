"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Schedule } from "@/types/api";

interface ScheduleTableProps {
  schedules: Schedule[];
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
  isLoading: boolean;
}

function formatTimeRange(schedule: Schedule): string {
  if (schedule.type === "FEREASTRA" && schedule.startWindowEnd && schedule.endWindowStart) {
    return `${schedule.startTime}\u2013${schedule.startWindowEnd} \u2192 ${schedule.endWindowStart}\u2013${schedule.endTime}`;
  }
  return `${schedule.startTime} \u2013 ${schedule.endTime}`;
}

export function ScheduleTable({
  schedules,
  onEdit,
  onDelete,
  isLoading,
}: ScheduleTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Min Hours</TableHead>
            <TableHead>Break (min)</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                No schedules found.
              </TableCell>
            </TableRow>
          ) : (
            schedules.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell className="font-medium">{schedule.name}</TableCell>
                <TableCell>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                    schedule.type === "FIX" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                    schedule.type === "FEREASTRA" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  )}>
                    {schedule.type === "FEREASTRA" ? "Fereastra" : schedule.type === "FLEX" ? "Flexibil" : "Fix"}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatTimeRange(schedule)}
                </TableCell>
                <TableCell>{schedule.minHoursPerDay}h</TableCell>
                <TableCell>{schedule.breakMinutes} min</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(schedule)}
                      title="Edit schedule"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(schedule)}
                      title="Delete schedule"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
