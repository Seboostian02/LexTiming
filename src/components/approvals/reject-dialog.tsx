"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  date: string;
  onConfirm: (comment: string) => void;
  isPending: boolean;
}

export function RejectDialog({
  open,
  onOpenChange,
  employeeName,
  date,
  onConfirm,
  isPending,
}: RejectDialogProps) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    const trimmed = comment.trim();
    if (!trimmed) {
      setError("A comment is required when rejecting a timesheet.");
      return;
    }
    setError("");
    onConfirm(trimmed);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setComment("");
      setError("");
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Timesheet</DialogTitle>
          <DialogDescription>
            You are rejecting the timesheet for{" "}
            <span className="font-medium text-foreground">{employeeName}</span>{" "}
            on{" "}
            <span className="font-medium text-foreground">{date}</span>.
            Please provide a reason for the rejection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="reject-comment">Rejection Reason *</Label>
          <Textarea
            id="reject-comment"
            placeholder="Explain why this timesheet is being rejected..."
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (error) setError("");
            }}
            rows={4}
            disabled={isPending}
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isPending || !comment.trim()}
          >
            {isPending ? "Rejecting..." : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
