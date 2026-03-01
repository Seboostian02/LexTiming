"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useMarkLeave } from "@/hooks/use-timesheet";

interface MarkLeaveDialogProps {
  employee: { id: string; firstName: string; lastName: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Generate all weekday dates (Mon-Fri) between start and end inclusive. */
function getWeekdaysBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(start + "T00:00:00.000Z");
  const endDate = new Date(end + "T00:00:00.000Z");

  while (cursor <= endDate) {
    const day = cursor.getUTCDay();
    if (day >= 1 && day <= 5) {
      dates.push(cursor.toISOString().substring(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function MarkLeaveDialog({
  employee,
  open,
  onOpenChange,
}: MarkLeaveDialogProps) {
  const todayStr = new Date().toISOString().substring(0, 10);

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [dayType, setDayType] = useState<"CO" | "CM">("CO");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<{
    created: number;
    errors: string[];
  } | null>(null);

  const markLeave = useMarkLeave();

  // State resets via key prop on parent (key={employee?.id})

  const handleSubmit = async () => {
    if (!employee) return;

    const dates = getWeekdaysBetween(startDate, endDate);
    if (dates.length === 0) {
      setResult({ created: 0, errors: ["No weekdays in the selected range"] });
      return;
    }

    try {
      const res = await markLeave.mutateAsync({
        employeeId: employee.id,
        dates,
        dayType,
        note: note.trim() || undefined,
      });
      setResult(res);
    } catch (err) {
      setResult({
        created: 0,
        errors: [err instanceof Error ? err.message : "Failed to mark leave"],
      });
    }
  };

  const isSubmitting = markLeave.isPending;
  const hasResult = result !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Mark Leave &mdash; {employee?.firstName} {employee?.lastName}
          </DialogTitle>
        </DialogHeader>

        {!hasResult ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leave-start">Start Date</Label>
                <Input
                  id="leave-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave-end">End Date</Label>
                <Input
                  id="leave-end"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select
                value={dayType}
                onValueChange={(v) => setDayType(v as "CO" | "CM")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CO">CO &mdash; Concediu Odihna</SelectItem>
                  <SelectItem value="CM">CM &mdash; Concediu Medical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leave-note">Note (optional)</Label>
              <Textarea
                id="leave-note"
                placeholder="Add a note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {result.created > 0 && (
              <p className="text-sm text-green-700 dark:text-green-400">
                Successfully marked {result.created} day
                {result.created !== 1 ? "s" : ""} as {dayType}.
              </p>
            )}
            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">
                  {result.created === 0 ? "Failed:" : "Some days failed:"}
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-sm text-destructive">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {hasResult ? (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Mark Leave
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
