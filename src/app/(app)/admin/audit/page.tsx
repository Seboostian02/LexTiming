"use client";

import { AuditTable } from "@/components/admin/audit-table";

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Jurnal Audit</h1>
        <p className="text-sm text-muted-foreground">
          Vizualizeaza toate modificarile din sistem — pontari, aprobari,
          modificari angajati si programuri.
        </p>
      </div>
      <AuditTable />
    </div>
  );
}
