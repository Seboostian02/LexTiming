"use client";

import { useState } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import {
  Lock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  FileX,
  ChevronDown,
  Shield,
} from "lucide-react";
import {
  useCloseMonth,
  useMonthCloseValidation,
} from "@/hooks/use-reports";
import type { CloseBlockerItem } from "@/services/report.service";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Blocker Card

interface BlockerCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  items: CloseBlockerItem[];
  colorClass: string; // tailwind border / bg classes
  extra?: React.ReactNode;
}

function BlockerCard({ title, description, icon, items, colorClass, extra }: BlockerCardProps) {
  const [expanded, setExpanded] = useState(false);
  const totalCount = items.reduce((s, i) => s + i.count, 0);

  if (items.length === 0) return null;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card className={colorClass}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between text-left"
            >
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                {icon}
                {title}
                <Badge variant="outline" className="ml-1">
                  {totalCount}
                </Badge>
              </CardTitle>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  expanded && "rotate-180"
                )}
              />
            </button>
          </CollapsibleTrigger>
          <p className="text-xs text-muted-foreground">{description}</p>
          {extra}
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <ul className="space-y-1 text-sm">
              {items.map((item) => (
                <li
                  key={item.employeeId}
                  className="flex items-center justify-between"
                >
                  <span className="text-muted-foreground">
                    {item.employeeName}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {item.count} {item.count === 1 ? "day" : "days"}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Main Panel

export function MonthClosePanel() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(
    now.getFullYear().toString()
  );
  const [selectedMonth, setSelectedMonth] = useState(
    now.getMonth().toString()
  ); // 0-indexed for display
  const [forceDialogOpen, setForceDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const year = parseInt(selectedYear, 10);
  const month = parseInt(selectedMonth, 10) + 1; // 1-indexed for API

  const validation = useMonthCloseValidation(year, month);
  const closeMonth = useCloseMonth();

  const years = Array.from({ length: 5 }, (_, i) =>
    (now.getFullYear() - 2 + i).toString()
  );

  const handleClose = (force: boolean) => {
    closeMonth.mutate(
      { year, month, force },
      {
        onSuccess: (message) => {
          setResultMessage(message);
          setConfirmOpen(false);
          setForceDialogOpen(false);
        },
        onError: () => {
          setConfirmOpen(false);
          setForceDialogOpen(false);
        },
      }
    );
  };

  const data = validation.data;
  const isLoading = validation.isLoading;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Close Month
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Closing a month will lock all APPROVED timesheet entries for the
            selected month. Locked entries cannot be edited or reverted. The
            validation below shows any blockers that should be resolved first.
          </p>

          {/* Year / Month selectors */}
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={i.toString()}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading validation...
            </div>
          )}

          {/* Validation Results */}
          {data && (
            <div className="space-y-4">
              {/* Summary cards row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Ready to Lock */}
                <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                  <CardContent className="flex items-center gap-3 py-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">
                        Ready to Lock
                      </p>
                      <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                        {data.approvedCount}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Already Locked */}
                <Card className="border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/30">
                  <CardContent className="flex items-center gap-3 py-3">
                    <Lock className="h-5 w-5 text-gray-500 dark:text-gray-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Already Locked
                      </p>
                      <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                        {data.lockedCount}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Blocker cards */}
              {data.totalBlockers > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      {data.totalBlockers} blocker{data.totalBlockers !== 1 ? "s" : ""} found
                    </p>
                  </div>

                  <BlockerCard
                    title="Unsubmitted Days"
                    description="Employees haven't submitted these days for approval yet."
                    icon={
                      <FileX className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    }
                    items={data.blockers.draftDays}
                    colorClass="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                  />

                  <BlockerCard
                    title="Pending Approval"
                    description="These days are waiting for manager approval."
                    icon={
                      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    }
                    items={data.blockers.submittedDays}
                    colorClass="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30"
                    extra={
                      <Link
                        href="/approvals"
                        className="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                      >
                        Go to Approvals &rarr;
                      </Link>
                    }
                  />

                  <BlockerCard
                    title="Missing Clock-Out"
                    description="Employee clocked in but never clocked out."
                    icon={
                      <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
                    }
                    items={data.blockers.missingEndDays}
                    colorClass="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                  />

                  <BlockerCard
                    title="Missing Days"
                    description="Workdays with no timesheet entry. Employees need to add manual entries."
                    icon={
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    }
                    items={data.blockers.missingDays}
                    colorClass="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                  />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                {data.canClose ? (
                  <Button
                    onClick={() => setConfirmOpen(true)}
                    disabled={closeMonth.isPending || data.approvedCount === 0}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {closeMonth.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    Close Month
                  </Button>
                ) : (
                  <>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4" />
                      Normal close is blocked. Resolve the issues above, or use Force Close to lock only APPROVED entries.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setForceDialogOpen(true)}
                      disabled={closeMonth.isPending || data.approvedCount === 0}
                      className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                    >
                      {closeMonth.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Shield className="h-4 w-4" />
                      )}
                      Force Close (Override)
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Success message */}
          {resultMessage && (
            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-400">
                {resultMessage}
              </p>
            </div>
          )}

          {/* Error message */}
          {closeMonth.isError && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">
                {closeMonth.error.message}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Normal close confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Confirm Month Close
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to close{" "}
              <strong>
                {MONTHS[parseInt(selectedMonth, 10)]} {selectedYear}
              </strong>
              . This will lock all{" "}
              <strong>{data?.approvedCount ?? 0} APPROVED</strong> timesheet
              entries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closeMonth.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleClose(false)}
              disabled={closeMonth.isPending}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {closeMonth.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Confirm Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Force close confirmation dialog */}
      <AlertDialog open={forceDialogOpen} onOpenChange={setForceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Force Close -- Override Blockers
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to force-close{" "}
                  <strong>
                    {MONTHS[parseInt(selectedMonth, 10)]} {selectedYear}
                  </strong>{" "}
                  despite{" "}
                  <strong>
                    {data?.totalBlockers ?? 0} unresolved blocker
                    {(data?.totalBlockers ?? 0) !== 1 ? "s" : ""}
                  </strong>
                  .
                </p>
                <p>
                  Only the <strong>{data?.approvedCount ?? 0} APPROVED</strong>{" "}
                  entries will be locked. Draft, submitted, and incomplete
                  entries will remain in their current state.
                </p>
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/30">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    This action cannot be undone. Make sure you understand the
                    consequences before proceeding.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closeMonth.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleClose(true)}
              disabled={closeMonth.isPending}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {closeMonth.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Force Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
