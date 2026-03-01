"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Check, X, Clock, User, Calendar, ChevronRight, Users } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { RejectDialog } from "./reject-dialog";
import type { ApprovalItem } from "@/types/api";

interface ApprovalListProps {
  approvals: ApprovalItem[];
  isLoading: boolean;
  onApprove: (timesheetDayId: string) => void;
  onReject: (timesheetDayId: string, comment: string) => void;
  processingId: string | null;
  /** Show grouped-by-manager expandable sections (Admin only). */
  groupByManager?: boolean;
}

interface ManagerGroup {
  managerId: string;
  managerName: string;
  approvals: ApprovalItem[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "--:--";
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatHours(totalMinutes: number | null): string {
  if (totalMinutes === null || totalMinutes === undefined) return "--";
  const hours = totalMinutes / 60;
  return `${hours.toFixed(1)}h`;
}

function groupByManager(approvals: ApprovalItem[]): ManagerGroup[] {
  const map = new Map<string, ManagerGroup>();

  for (const item of approvals) {
    const mgr = item.timesheetDay.employee.manager;
    const key = mgr?.id ?? "_unassigned";
    const name = mgr ? `${mgr.firstName} ${mgr.lastName}` : "Fara manager";

    if (!map.has(key)) {
      map.set(key, { managerId: key, managerName: name, approvals: [] });
    }
    map.get(key)!.approvals.push(item);
  }

  // Sort groups: "Fara manager" first, then alphabetically
  return Array.from(map.values()).sort((a, b) => {
    if (a.managerId === "_unassigned") return -1;
    if (b.managerId === "_unassigned") return 1;
    return a.managerName.localeCompare(b.managerName);
  });
}

function ApprovalCard({
  item,
  processingId,
  onApprove,
  onRejectClick,
}: {
  item: ApprovalItem;
  processingId: string | null;
  onApprove: (id: string) => void;
  onRejectClick: (target: { id: string; employeeName: string; date: string }) => void;
}) {
  const { timesheetDay } = item;
  const employee = timesheetDay.employee;
  const employeeName = `${employee.firstName} ${employee.lastName}`;
  const isProcessing = processingId === item.timesheetDayId;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              {employeeName}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {employee.email}
              {employee.department && (
                <>
                  {" "}
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {employee.department}
                  </Badge>
                </>
              )}
            </p>
          </div>
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            Pending
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{formatDate(timesheetDay.date)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {formatTime(timesheetDay.startTime)} -{" "}
                {formatTime(timesheetDay.endTime)}
              </span>
            </div>
            <div className="font-medium">
              {formatHours(timesheetDay.totalMinutes)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
              onClick={() => onApprove(item.timesheetDayId)}
              disabled={isProcessing}
            >
              <Check className="h-3.5 w-3.5" />
              {isProcessing ? "Processing..." : "Approve"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={() =>
                onRejectClick({
                  id: item.timesheetDayId,
                  employeeName,
                  date: formatDate(timesheetDay.date),
                })
              }
              disabled={isProcessing}
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ApprovalList({
  approvals,
  isLoading,
  onApprove,
  onReject,
  processingId,
  groupByManager: showGroups = false,
}: ApprovalListProps) {
  const [rejectTarget, setRejectTarget] = useState<{
    id: string;
    employeeName: string;
    date: string;
  } | null>(null);

  const groups = useMemo(() => groupByManager(approvals), [approvals]);

  // All groups expanded by default — derived from groups, no effect needed
  const expanded = useMemo(() => new Set(groups.map((g) => g.managerId)), [groups]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function isGroupExpanded(managerId: string) {
    return expanded.has(managerId) && !collapsed.has(managerId);
  }

  function toggleGroup(managerId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(managerId)) {
        next.delete(managerId);
      } else {
        next.add(managerId);
      }
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-64 animate-pulse rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Check className="h-12 w-12 text-green-500 mb-3" />
          <h3 className="text-lg font-medium">All caught up!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            There are no pending approvals at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Manager view: flat list (no grouping needed, they only see their own subordinates)
  if (!showGroups) {
    return (
      <>
        <div className="space-y-3">
          {approvals.map((item) => (
            <ApprovalCard
              key={item.id}
              item={item}
              processingId={processingId}
              onApprove={onApprove}
              onRejectClick={setRejectTarget}
            />
          ))}
        </div>

        <RejectDialog
          open={rejectTarget !== null}
          onOpenChange={(open) => {
            if (!open) setRejectTarget(null);
          }}
          employeeName={rejectTarget?.employeeName ?? ""}
          date={rejectTarget?.date ?? ""}
          onConfirm={(comment) => {
            if (rejectTarget) {
              onReject(rejectTarget.id, comment);
              setRejectTarget(null);
            }
          }}
          isPending={processingId !== null}
        />
      </>
    );
  }

  // Admin view: grouped by manager with expandable sections
  return (
    <>
      <div className="space-y-4">
        {groups.map((group) => {
          const groupExpanded = isGroupExpanded(group.managerId);

          return (
            <Collapsible
              key={group.managerId}
              open={groupExpanded}
              onOpenChange={() => toggleGroup(group.managerId)}
            >
              <div className="space-y-2">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                        groupExpanded && "rotate-90"
                      )}
                    />
                    <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{group.managerName}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {group.approvals.length}
                    </Badge>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="ml-6 space-y-3">
                    {group.approvals.map((item) => (
                      <ApprovalCard
                        key={item.id}
                        item={item}
                        processingId={processingId}
                        onApprove={onApprove}
                        onRejectClick={setRejectTarget}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      <RejectDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        employeeName={rejectTarget?.employeeName ?? ""}
        date={rejectTarget?.date ?? ""}
        onConfirm={(comment) => {
          if (rejectTarget) {
            onReject(rejectTarget.id, comment);
            setRejectTarget(null);
          }
        }}
        isPending={processingId !== null}
      />
    </>
  );
}
