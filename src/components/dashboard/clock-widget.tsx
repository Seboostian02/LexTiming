"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Send, Clock, Coffee, Calendar } from "lucide-react";
import { useTodayTimesheet, useClockAction } from "@/hooks/use-timesheet";
import { CLOCK_STATES, CLOCK_ACTIONS } from "@/lib/constants";
import type { ClockState } from "@/lib/constants";

function formatTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, "0")).join(":");
}

function getTotalBreakMs(
  breaks: { start: string; end?: string }[],
  excludeOngoing = false
): number {
  return breaks.reduce((acc, b) => {
    const start = new Date(b.start).getTime();
    if (!b.end) {
      if (excludeOngoing) return acc;
      return acc + (Date.now() - start);
    }
    return acc + (new Date(b.end).getTime() - start);
  }, 0);
}

const STATE_CONFIG: Record<
  ClockState,
  { label: string; dotClass: string; timerClass: string }
> = {
  [CLOCK_STATES.NOT_CLOCKED]: {
    label: "Not Clocked In",
    dotClass: "bg-gray-400",
    timerClass: "text-muted-foreground",
  },
  [CLOCK_STATES.WORKING]: {
    label: "Working",
    dotClass: "bg-green-500 animate-pulse",
    timerClass: "text-green-600 dark:text-green-400",
  },
  [CLOCK_STATES.ON_BREAK]: {
    label: "On Break",
    dotClass: "bg-yellow-500",
    timerClass: "text-yellow-600 dark:text-yellow-400",
  },
  [CLOCK_STATES.STOPPED]: {
    label: "Day Complete",
    dotClass: "bg-blue-500",
    timerClass: "text-blue-600 dark:text-blue-400",
  },
};

export function ClockWidget() {
  const { data: timesheet, isLoading, isError } = useTodayTimesheet();
  const clockAction = useClockAction();
  const [displayTime, setDisplayTime] = useState(() => "00:00:00");

  const clockState: ClockState = timesheet?.clockState ?? CLOCK_STATES.NOT_CLOCKED;
  const config = STATE_CONFIG[clockState];

  const calculateElapsed = useCallback(() => {
    if (!timesheet) return 0;

    if (clockState === CLOCK_STATES.STOPPED) {
      return (timesheet.totalMinutes ?? 0) * 60;
    }

    if (clockState === CLOCK_STATES.NOT_CLOCKED || !timesheet.startTime) {
      return 0;
    }

    const startMs = new Date(timesheet.startTime).getTime();
    const breaks = timesheet.breaks ?? [];

    if (clockState === CLOCK_STATES.WORKING) {
      const totalBreakMs = getTotalBreakMs(breaks);
      const elapsed = Date.now() - startMs - totalBreakMs;
      return Math.max(0, Math.floor(elapsed / 1000));
    }

    if (clockState === CLOCK_STATES.ON_BREAK) {
      // Find the ongoing break (no end time)
      const ongoingBreak = breaks.find((b) => !b.end);
      if (!ongoingBreak) {
        // Fallback: use all completed breaks
        const totalBreakMs = getTotalBreakMs(breaks);
        const elapsed = Date.now() - startMs - totalBreakMs;
        return Math.max(0, Math.floor(elapsed / 1000));
      }
      // Freeze at the moment the break started
      const breakStartMs = new Date(ongoingBreak.start).getTime();
      const completedBreakMs = getTotalBreakMs(
        breaks.filter((b) => b.end),
        true
      );
      const elapsed = breakStartMs - startMs - completedBreakMs;
      return Math.max(0, Math.floor(elapsed / 1000));
    }

    return 0;
  }, [timesheet, clockState]);

  useEffect(() => {
    const update = () => setDisplayTime(formatTime(calculateElapsed()));

    // Deferred initial update to avoid synchronous setState in effect
    const timeout = setTimeout(update, 0);

    // Only tick for WORKING state
    if (clockState !== CLOCK_STATES.WORKING) {
      return () => clearTimeout(timeout);
    }

    const interval = setInterval(update, 1000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [clockState, calculateElapsed]);

  const handleAction = (action: string) => {
    clockAction.mutate({ action: action as typeof CLOCK_ACTIONS[keyof typeof CLOCK_ACTIONS] });
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-16 w-48 animate-pulse rounded-lg bg-muted" />
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-destructive py-8">
            Failed to load timesheet data. Please try refreshing.
          </p>
        </CardContent>
      </Card>
    );
  }

  const breakCount = timesheet?.breaks?.length ?? 0;
  const startTimeFormatted = timesheet?.startTime
    ? new Date(timesheet.startTime).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Today
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date display */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {today}
        </div>

        {/* State indicator */}
        <div className="flex items-center justify-center gap-2">
          <span className={`inline-block h-3 w-3 rounded-full ${config.dotClass}`} />
          <span className="text-sm font-medium">{config.label}</span>
        </div>

        {/* Live timer */}
        <div className="flex justify-center">
          <span
            className={`font-mono text-5xl font-bold tracking-wider ${config.timerClass}`}
          >
            {displayTime}
          </span>
        </div>

        {/* Info row */}
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Start: {startTimeFormatted}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Coffee className="h-3.5 w-3.5" />
            <span>
              {breakCount} {breakCount === 1 ? "break" : "breaks"}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-3">
          {clockState === CLOCK_STATES.NOT_CLOCKED && (
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
              onClick={() => handleAction(CLOCK_ACTIONS.START)}
              disabled={clockAction.isPending}
            >
              <Play className="h-4 w-4" />
              Start
            </Button>
          )}

          {clockState === CLOCK_STATES.WORKING && (
            <>
              <Button
                size="lg"
                className="bg-yellow-500 hover:bg-yellow-600 text-white gap-2"
                onClick={() => handleAction(CLOCK_ACTIONS.PAUSE)}
                disabled={clockAction.isPending}
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
              <Button
                size="lg"
                variant="destructive"
                className="gap-2"
                onClick={() => handleAction(CLOCK_ACTIONS.STOP)}
                disabled={clockAction.isPending}
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </>
          )}

          {clockState === CLOCK_STATES.ON_BREAK && (
            <>
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                onClick={() => handleAction(CLOCK_ACTIONS.RESUME)}
                disabled={clockAction.isPending}
              >
                <Play className="h-4 w-4" />
                Resume
              </Button>
              <Button
                size="lg"
                variant="destructive"
                className="gap-2"
                onClick={() => handleAction(CLOCK_ACTIONS.STOP)}
                disabled={clockAction.isPending}
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </>
          )}

          {clockState === CLOCK_STATES.STOPPED && (
            <Button size="lg" className="gap-2" disabled>
              <Send className="h-4 w-4" />
              Submit for Approval
            </Button>
          )}
        </div>

        {/* Mutation error display */}
        {clockAction.isError && (
          <p className="text-center text-sm text-destructive">
            {clockAction.error.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
