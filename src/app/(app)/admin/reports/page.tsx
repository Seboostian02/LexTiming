"use client";

import { ReportTable } from "@/components/admin/report-table";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Monthly Reports</h1>
        <p className="text-sm text-muted-foreground">
          View attendance reports and export data for any month.
        </p>
      </div>

      <ReportTable />
    </div>
  );
}
