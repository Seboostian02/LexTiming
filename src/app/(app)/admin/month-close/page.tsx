"use client";

import { MonthClosePanel } from "@/components/admin/month-close-panel";

export default function MonthClosePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Month Closing</h1>
        <p className="text-sm text-muted-foreground">
          Lock approved timesheet entries for a completed month.
        </p>
      </div>

      <MonthClosePanel />
    </div>
  );
}
