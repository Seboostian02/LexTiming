"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Clock, Send, Save, Loader2, AlertCircle } from "lucide-react";
import {
  useTimesheetDay,
  useUpdateTimesheet,
  useSubmitTimesheet,
  useCreateManualTimesheet,
} from "@/hooks/use-timesheet";
import { cn } from "@/lib/utils";

interface DayDetailDialogProps {
  timesheetId: string | null;
  date?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "APPROVED":
      return "default";
    case "SUBMITTED":
      return "secondary";
    case "REJECTED":
      return "destructive";
    default:
      return "outline";
  }
}

function formatMinutesToDisplay(totalMinutes: number | null): string {
  if (totalMinutes === null) return "--";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins}m`;
}

function isoToTimeInput(isoString: string | null): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    return format(date, "HH:mm");
  } catch {
    return "";
  }
}

function timeInputToIso(dateStr: string, timeStr: string): string {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date(dateStr);
  date.setUTCHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export function DayDetailDialog({
  timesheetId,
  date,
  open,
  onOpenChange,
}: DayDetailDialogProps) {
  const isCreateMode = !timesheetId && !!date;

  const {
    data: dayDetail,
    isLoading,
    isError,
  } = useTimesheetDay(open && !isCreateMode ? timesheetId : null);

  const updateMutation = useUpdateTimesheet();
  const submitMutation = useSubmitTimesheet();
  const createMutation = useCreateManualTimesheet();

  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editNote, setEditNote] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");

  // Sync form state when async day detail loads
  useEffect(() => {
    if (dayDetail) {
      setEditStartTime(isoToTimeInput(dayDetail.startTime));
      setEditEndTime(isoToTimeInput(dayDetail.endTime));
      setEditNote(dayDetail.note ?? "");
      setCorrectionReason("");
    }
  }, [dayDetail]);

  // Reset form for create mode
  useEffect(() => {
    if (isCreateMode && open) {
      setEditStartTime("");
      setEditEndTime("");
      setEditNote("");
    }
  }, [isCreateMode, open]);

  const isEditable =
    dayDetail?.status === "DRAFT" || dayDetail?.status === "REJECTED";

  const canSubmit =
    (dayDetail?.status === "DRAFT" || dayDetail?.status === "REJECTED") &&
    dayDetail.startTime !== null &&
    dayDetail.endTime !== null;

  const isRejected = dayDetail?.status === "REJECTED";
  const canSubmitFinal = canSubmit && (!isRejected || correctionReason.length >= 20);

  const rejectionComment = dayDetail?.approvals?.find(
    (a) => a.decision === "REJECTED"
  );

  const handleSave = () => {
    if (!dayDetail || !timesheetId) return;

    const dateStr = dayDetail.date.substring(0, 10);
    const data: { startTime?: string; endTime?: string; note?: string } = {};

    if (editStartTime) {
      data.startTime = timeInputToIso(dateStr, editStartTime);
    }
    if (editEndTime) {
      data.endTime = timeInputToIso(dateStr, editEndTime);
    }
    data.note = editNote;

    updateMutation.mutate(
      { id: timesheetId, data },
      {
        onSuccess: () => {
          // Keep dialog open to show updated data
        },
      }
    );
  };

  const handleSubmit = () => {
    if (!timesheetId || !dayDetail) return;

    if (dayDetail.status === "REJECTED") {
      // For rejected days: save changes (resets REJECTED -> DRAFT), then submit
      const dateStr = dayDetail.date.substring(0, 10);
      const data: { startTime?: string; endTime?: string; note?: string } = {};
      if (editStartTime) data.startTime = timeInputToIso(dateStr, editStartTime);
      if (editEndTime) data.endTime = timeInputToIso(dateStr, editEndTime);
      data.note = `[CORECTIE] ${correctionReason}\n\n${editNote}`.trim();

      updateMutation.mutate(
        { id: timesheetId, data },
        {
          onSuccess: () => {
            // After save succeeds (status is now DRAFT), submit
            submitMutation.mutate(timesheetId, {
              onSuccess: () => onOpenChange(false),
            });
          },
        }
      );
      return;
    }

    // Normal DRAFT submission
    submitMutation.mutate(timesheetId, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const handleCreate = () => {
    if (!date || !editStartTime || !editEndTime) return;
    createMutation.mutate(
      { date, startTime: editStartTime, endTime: editEndTime, note: editNote || undefined },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const breakCount = dayDetail?.breaks?.length ?? 0;
  const totalBreakMinutes =
    dayDetail?.breaks?.reduce((sum, b) => {
      const start = new Date(b.start).getTime();
      if (!b.end) return sum; // active break, not yet ended
      const end = new Date(b.end).getTime();
      return sum + (end - start) / 60_000;
    }, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {isCreateMode && date
              ? `Add Manual Entry — ${format(new Date(date + "T00:00:00"), "EEEE, MMMM d, yyyy")}`
              : dayDetail
              ? format(new Date(dayDetail.date), "EEEE, MMMM d, yyyy")
              : "Day Details"}
          </DialogTitle>
          {!isCreateMode && dayDetail && (
            <DialogDescription className="flex items-center gap-2">
              Status:{" "}
              <Badge variant={getStatusBadgeVariant(dayDetail.status)}>
                {dayDetail.status}
              </Badge>
              {dayDetail.dayType !== "WORK" && (
                <Badge variant="outline">{dayDetail.dayType}</Badge>
              )}
            </DialogDescription>
          )}
          {isCreateMode && (
            <DialogDescription>
              Create a timesheet entry for this missed day.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Create mode */}
        {isCreateMode && (
          <>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-start-time">Start Time</Label>
                  <Input
                    id="create-start-time"
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-end-time">End Time</Label>
                  <Input
                    id="create-end-time"
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-note">Note</Label>
                <Textarea
                  id="create-note"
                  placeholder="Add a note about this day..."
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={3}
                />
              </div>

              {createMutation.isError && (
                <p className="text-sm text-destructive">
                  {createMutation.error.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={!editStartTime || !editEndTime || createMutation.isPending}
                className="gap-2"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Entry
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Loading state */}
        {!isCreateMode && isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error state */}
        {!isCreateMode && isError && (
          <div className="py-4 text-center text-sm text-destructive">
            Failed to load day details. Please try again.
          </div>
        )}

        {/* Content */}
        {!isCreateMode && dayDetail && !isLoading && (
          <div className="space-y-4">
            {/* Rejection comment warning */}
            {dayDetail.status === "REJECTED" && rejectionComment && (
              <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    Rejected by {rejectionComment.approver.firstName}{" "}
                    {rejectionComment.approver.lastName}
                  </p>
                  {rejectionComment.comment && (
                    <p className="text-sm text-red-600 dark:text-red-300">
                      {rejectionComment.comment}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Anomaly warnings */}
            {dayDetail.anomalies && dayDetail.anomalies.length > 0 && (
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Anomalii detectate
                  </p>
                  {dayDetail.anomalies.map((a: string) => {
                    const isRed = a === "MISSING_END" || a === "MISSING_DAY";
                    const label =
                      a === "MISSING_END" ? "Fara stop, ziua nu a fost inchisa"
                      : a === "MISSING_DAY" ? "Lipsa pontaj"
                      : a === "EARLY_START" ? "Start devreme, inainte de fereastra programului"
                      : a === "LATE_END" ? "Stop tarziu, dupa fereastra programului"
                      : a === "UNDER_HOURS" ? "Ore insuficiente, sub norma zilnica"
                      : "Ore excesive, peste 10 ore lucrate";
                    return (
                      <p key={a} className={cn("text-sm", isRed ? "text-red-600 dark:text-red-300" : "text-amber-600 dark:text-amber-300")}>
                        • {label}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Editable form for DRAFT / REJECTED */}
            {isEditable ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Read-only break info */}
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>
                    Breaks: {breakCount} ({Math.round(totalBreakMinutes)}m)
                  </span>
                  <span>
                    Total:{" "}
                    {formatMinutesToDisplay(dayDetail.totalMinutes)}
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Note</Label>
                  <Textarea
                    id="note"
                    placeholder="Add a note about this day..."
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    rows={3}
                  />
                </div>

                {isRejected && (
                  <div className="space-y-2">
                    <Label htmlFor="correction-reason">
                      Motiv corectie (obligatoriu)
                    </Label>
                    <Textarea
                      id="correction-reason"
                      placeholder="Explicati motivul corectiei (minim 20 caractere)..."
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      rows={3}
                      className={cn(
                        correctionReason.length > 0 && correctionReason.length < 20 &&
                          "border-amber-500 focus-visible:ring-amber-500"
                      )}
                    />
                    <p className="text-xs text-muted-foreground">
                      {correctionReason.length}/20 caractere minim
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Read-only view for SUBMITTED / APPROVED / LOCKED */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Start Time</p>
                    <p className="text-sm font-medium">
                      {dayDetail.startTime
                        ? format(new Date(dayDetail.startTime), "HH:mm")
                        : "--:--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">End Time</p>
                    <p className="text-sm font-medium">
                      {dayDetail.endTime
                        ? format(new Date(dayDetail.endTime), "HH:mm")
                        : "--:--"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Breaks</p>
                    <p className="text-sm font-medium">
                      {breakCount} ({Math.round(totalBreakMinutes)}m)
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Hours</p>
                    <p className="text-sm font-medium">
                      {formatMinutesToDisplay(dayDetail.totalMinutes)}
                    </p>
                  </div>
                </div>

                {dayDetail.note && (
                  <div>
                    <p className="text-xs text-muted-foreground">Note</p>
                    <p className="text-sm">{dayDetail.note}</p>
                  </div>
                )}
              </div>
            )}

            {/* Mutation error display */}
            {updateMutation.isError && (
              <p className="text-sm text-destructive">
                {updateMutation.error.message}
              </p>
            )}
            {submitMutation.isError && (
              <p className="text-sm text-destructive">
                {submitMutation.error.message}
              </p>
            )}
          </div>
        )}

        {/* Footer with actions */}
        {dayDetail && isEditable && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="gap-2"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
            {canSubmitFinal && (
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending || updateMutation.isPending}
                className="gap-2"
              >
                {(submitMutation.isPending || updateMutation.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isRejected ? "Retrimite cu corectie" : "Submit for Approval"}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
