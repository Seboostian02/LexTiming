"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ApprovalList } from "@/components/approvals/approval-list";
import { usePendingApprovals, useProcessApproval } from "@/hooks/use-approvals";
import { useAuth } from "@/context/auth-context";
import { ROLES } from "@/lib/constants";

export default function ApprovalsPage() {
  const { user } = useAuth();
  const { data: approvals, isLoading, isError } = usePendingApprovals();
  const processApproval = useProcessApproval();
  const isAdmin = user?.role === ROLES.ADMIN;
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingCount = approvals?.length ?? 0;

  function handleApprove(timesheetDayId: string) {
    setProcessingId(timesheetDayId);
    processApproval.mutate(
      { id: timesheetDayId, decision: "APPROVED" },
      {
        onSettled: () => setProcessingId(null),
      }
    );
  }

  function handleReject(timesheetDayId: string, comment: string) {
    setProcessingId(timesheetDayId);
    processApproval.mutate(
      { id: timesheetDayId, decision: "REJECTED", comment },
      {
        onSettled: () => setProcessingId(null),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Approvals</h1>
        {pendingCount > 0 && (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Failed to load approvals. You may not have permission to view this
            page, or there was a server error. Please try refreshing.
          </p>
        </div>
      ) : (
        <>
          {processApproval.isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">
                {processApproval.error.message}
              </p>
            </div>
          )}

          <ApprovalList
            approvals={approvals ?? []}
            isLoading={isLoading}
            onApprove={handleApprove}
            onReject={handleReject}
            processingId={processingId}
            groupByManager={isAdmin}
          />
        </>
      )}
    </div>
  );
}
