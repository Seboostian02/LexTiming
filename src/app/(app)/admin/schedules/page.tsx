"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CalendarClock, Loader2, AlertTriangle } from "lucide-react";
import { ScheduleTable } from "@/components/admin/schedule-table";
import { ScheduleForm } from "@/components/admin/schedule-form";
import {
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
} from "@/hooks/use-schedules";
import type { Schedule } from "@/types/api";
import type { CreateScheduleInput, UpdateScheduleInput } from "@/schemas/schedule.schema";

export default function SchedulesPage() {
  const { data: schedules = [], isLoading } = useSchedules();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const [formOpen, setFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(
    null
  );

  const handleAddSchedule = () => {
    setEditingSchedule(null);
    setFormOpen(true);
  };

  const handleEditSchedule = useCallback((schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormOpen(true);
  }, []);

  const handleDeletePrompt = useCallback((schedule: Schedule) => {
    setDeletingSchedule(schedule);
  }, []);

  const handleDeleteConfirm = () => {
    if (!deletingSchedule) return;
    deleteSchedule.mutate(deletingSchedule.id, {
      onSuccess: () => {
        setDeletingSchedule(null);
      },
    });
  };

  const handleFormSubmit = (data: CreateScheduleInput | UpdateScheduleInput) => {
    if (editingSchedule) {
      updateSchedule.mutate(
        { id: editingSchedule.id, data: data as UpdateScheduleInput },
        {
          onSuccess: () => {
            setFormOpen(false);
            setEditingSchedule(null);
          },
        }
      );
    } else {
      createSchedule.mutate(data as CreateScheduleInput, {
        onSuccess: () => {
          setFormOpen(false);
        },
      });
    }
  };

  const isPending = editingSchedule
    ? updateSchedule.isPending
    : createSchedule.isPending;

  const error = editingSchedule
    ? updateSchedule.error
    : createSchedule.error;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schedule Management</h1>
          <p className="text-sm text-muted-foreground">
            Define work schedules and assign them to employees.
          </p>
        </div>
        <Button onClick={handleAddSchedule} className="gap-2">
          <CalendarClock className="h-4 w-4" />
          Add Schedule
        </Button>
      </div>

      <ScheduleTable
        schedules={schedules}
        onEdit={handleEditSchedule}
        onDelete={handleDeletePrompt}
        isLoading={isLoading}
      />

      <ScheduleForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingSchedule(null);
        }}
        schedule={editingSchedule}
        onSubmit={handleFormSubmit}
        isPending={isPending}
        error={error}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={deletingSchedule !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingSchedule(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Delete Schedule
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the schedule{" "}
              <strong>{deletingSchedule?.name}</strong>? This action cannot be
              undone. Schedules with assigned employees cannot be deleted.
            </DialogDescription>
          </DialogHeader>

          {deleteSchedule.isError && (
            <p className="text-sm text-destructive">
              {deleteSchedule.error.message}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeletingSchedule(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteSchedule.isPending}
              className="gap-2"
            >
              {deleteSchedule.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
