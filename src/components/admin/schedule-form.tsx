"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { CreateScheduleInput, UpdateScheduleInput } from "@/schemas/schedule.schema";
import type { Schedule } from "@/types/api";

interface ScheduleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: Schedule | null;
  onSubmit: (data: CreateScheduleInput | UpdateScheduleInput) => void;
  isPending: boolean;
  error: Error | null;
}

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const scheduleFormSchema = z.object({
  name: z.string().min(1, "Schedule name is required"),
  type: z.enum(["FIX", "FEREASTRA", "FLEX"]),
  startTime: z.string().regex(timeRegex, "Invalid time format (HH:MM)"),
  endTime: z.string().regex(timeRegex, "Invalid time format (HH:MM)"),
  startWindowEnd: z.string().regex(timeRegex, "Invalid time format (HH:MM)").nullable().optional(),
  endWindowStart: z.string().regex(timeRegex, "Invalid time format (HH:MM)").nullable().optional(),
  earlyStartMinutes: z.number().min(0).max(120),
  lateEndMinutes: z.number().min(0).max(120),
  minHoursPerDay: z.number().min(1).max(24),
  breakMinutes: z.number().min(0).max(120),
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

export function ScheduleForm({
  open,
  onOpenChange,
  schedule,
  onSubmit,
  isPending,
  error,
}: ScheduleFormProps) {
  const isEdit = schedule !== null;

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      name: "",
      type: "FIX",
      startTime: "09:00",
      endTime: "17:00",
      startWindowEnd: null,
      endWindowStart: null,
      earlyStartMinutes: 30,
      lateEndMinutes: 30,
      minHoursPerDay: 8,
      breakMinutes: 30,
    },
  });

  const selectedType = form.watch("type");

  useEffect(() => {
    if (open) {
      if (isEdit && schedule) {
        form.reset({
          name: schedule.name,
          type: schedule.type as "FIX" | "FEREASTRA" | "FLEX",
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          startWindowEnd: schedule.startWindowEnd ?? null,
          endWindowStart: schedule.endWindowStart ?? null,
          earlyStartMinutes: schedule.earlyStartMinutes ?? 0,
          lateEndMinutes: schedule.lateEndMinutes ?? 0,
          minHoursPerDay: schedule.minHoursPerDay,
          breakMinutes: schedule.breakMinutes,
        });
      } else {
        form.reset({
          name: "",
          type: "FIX",
          startTime: "09:00",
          endTime: "17:00",
          startWindowEnd: null,
          endWindowStart: null,
          earlyStartMinutes: 30,
          lateEndMinutes: 30,
          minHoursPerDay: 8,
          breakMinutes: 30,
        });
      }
    }
  }, [open, isEdit, schedule, form]);

  // Set sensible defaults when type changes (only in create mode)
  useEffect(() => {
    if (isEdit) return;
    if (selectedType === "FIX") {
      form.setValue("startTime", "09:00");
      form.setValue("endTime", "17:00");
      form.setValue("earlyStartMinutes", 30);
      form.setValue("lateEndMinutes", 30);
      form.setValue("startWindowEnd", null);
      form.setValue("endWindowStart", null);
    } else if (selectedType === "FEREASTRA") {
      form.setValue("startTime", "08:00");
      form.setValue("endTime", "18:00");
      form.setValue("startWindowEnd", "10:00");
      form.setValue("endWindowStart", "16:00");
      form.setValue("earlyStartMinutes", 0);
      form.setValue("lateEndMinutes", 0);
    } else if (selectedType === "FLEX") {
      form.setValue("startTime", "07:00");
      form.setValue("endTime", "21:00");
      form.setValue("startWindowEnd", null);
      form.setValue("endWindowStart", null);
      form.setValue("earlyStartMinutes", 0);
      form.setValue("lateEndMinutes", 0);
      form.setValue("minHoursPerDay", 6);
    }
  }, [selectedType, isEdit, form]);

  const handleFormSubmit = (data: ScheduleFormData) => {
    // Clean up fields based on type before submitting
    const cleaned = { ...data };
    if (cleaned.type === "FIX") {
      cleaned.startWindowEnd = null;
      cleaned.endWindowStart = null;
    } else if (cleaned.type === "FEREASTRA") {
      cleaned.earlyStartMinutes = 0;
      cleaned.lateEndMinutes = 0;
    } else if (cleaned.type === "FLEX") {
      cleaned.startWindowEnd = null;
      cleaned.endWindowStart = null;
      cleaned.earlyStartMinutes = 0;
      cleaned.lateEndMinutes = 0;
    }
    onSubmit(cleaned);
  };

  const { register, handleSubmit, formState: { errors }, control } = form;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={selectedType === "FEREASTRA" ? "sm:max-w-lg" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Schedule" : "Add Schedule"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the schedule details below."
              : "Fill in the details to create a new schedule."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="space-y-4 py-4">
            {/* Schedule Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Schedule Name</Label>
              <Input
                id="name"
                placeholder="Standard Schedule"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Schedule Type Selector */}
            <div className="space-y-2">
              <Label>Schedule Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIX">Fix</SelectItem>
                      <SelectItem value="FEREASTRA">Fereastra</SelectItem>
                      <SelectItem value="FLEX">Flexibil</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-sm text-destructive">
                  {errors.type.message}
                </p>
              )}
            </div>

            {/* FIX: Start Time / End Time */}
            {selectedType === "FIX" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      {...register("startTime")}
                    />
                    {errors.startTime && (
                      <p className="text-sm text-destructive">
                        {errors.startTime.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      {...register("endTime")}
                    />
                    {errors.endTime && (
                      <p className="text-sm text-destructive">
                        {errors.endTime.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="earlyStartMinutes">Early Start Tolerance (min)</Label>
                    <Input
                      id="earlyStartMinutes"
                      type="number"
                      min={0}
                      max={120}
                      {...register("earlyStartMinutes", { valueAsNumber: true })}
                    />
                    {errors.earlyStartMinutes && (
                      <p className="text-sm text-destructive">
                        {errors.earlyStartMinutes.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lateEndMinutes">Late End Tolerance (min)</Label>
                    <Input
                      id="lateEndMinutes"
                      type="number"
                      min={0}
                      max={120}
                      {...register("lateEndMinutes", { valueAsNumber: true })}
                    />
                    {errors.lateEndMinutes && (
                      <p className="text-sm text-destructive">
                        {errors.lateEndMinutes.message}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* FEREASTRA: 2x2 grid of time windows */}
            {selectedType === "FEREASTRA" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Window Start (from)</Label>
                    <Input
                      id="startTime"
                      type="time"
                      {...register("startTime")}
                    />
                    {errors.startTime && (
                      <p className="text-sm text-destructive">
                        {errors.startTime.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startWindowEnd">Window Start (to)</Label>
                    <Input
                      id="startWindowEnd"
                      type="time"
                      {...register("startWindowEnd")}
                    />
                    {errors.startWindowEnd && (
                      <p className="text-sm text-destructive">
                        {errors.startWindowEnd.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="endWindowStart">Window End (from)</Label>
                    <Input
                      id="endWindowStart"
                      type="time"
                      {...register("endWindowStart")}
                    />
                    {errors.endWindowStart && (
                      <p className="text-sm text-destructive">
                        {errors.endWindowStart.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">Window End (to)</Label>
                    <Input
                      id="endTime"
                      type="time"
                      {...register("endTime")}
                    />
                    {errors.endTime && (
                      <p className="text-sm text-destructive">
                        {errors.endTime.message}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* FLEX: Earliest Start / Latest End */}
            {selectedType === "FLEX" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Earliest Start</Label>
                  <Input
                    id="startTime"
                    type="time"
                    {...register("startTime")}
                  />
                  {errors.startTime && (
                    <p className="text-sm text-destructive">
                      {errors.startTime.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Latest End</Label>
                  <Input
                    id="endTime"
                    type="time"
                    {...register("endTime")}
                  />
                  {errors.endTime && (
                    <p className="text-sm text-destructive">
                      {errors.endTime.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Common fields: Min Hours/Day and Break */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minHoursPerDay">Min Hours/Day</Label>
                <Input
                  id="minHoursPerDay"
                  type="number"
                  min={1}
                  max={24}
                  step={0.5}
                  {...register("minHoursPerDay", {
                    valueAsNumber: true,
                  })}
                />
                {errors.minHoursPerDay && (
                  <p className="text-sm text-destructive">
                    {errors.minHoursPerDay.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="breakMinutes">Break (minutes)</Label>
                <Input
                  id="breakMinutes"
                  type="number"
                  min={0}
                  max={120}
                  {...register("breakMinutes", {
                    valueAsNumber: true,
                  })}
                />
                {errors.breakMinutes && (
                  <p className="text-sm text-destructive">
                    {errors.breakMinutes.message}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEdit ? "Save Changes" : "Create Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
