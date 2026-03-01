"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { useAuditLogs, useAuditActors } from "@/hooks/use-audit";
import type { AuditLogEntry } from "@/types/audit";

const ENTITY_OPTIONS = [
  { value: "TimesheetDay", label: "TimesheetDay" },
  { value: "Employee", label: "Employee" },
  { value: "Schedule", label: "Schedule" },
];

const ACTION_OPTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "REJECT",
  "LOCK",
  "CLOCK_IN",
  "CLOCK_OUT",
  "CLOCK_PAUSE",
  "CLOCK_RESUME",
  "SUBMIT",
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function getActionBadge(action: string) {
  let className = "";
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

  switch (action) {
    case "CLOCK_IN":
    case "CLOCK_OUT":
    case "CLOCK_PAUSE":
    case "CLOCK_RESUME":
      className =
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100";
      variant = "outline";
      break;
    case "CREATE":
    case "APPROVE":
      className =
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100";
      variant = "outline";
      break;
    case "UPDATE":
    case "SUBMIT":
      className =
        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100";
      variant = "outline";
      break;
    case "DELETE":
    case "REJECT":
      className =
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100";
      variant = "destructive";
      break;
    case "LOCK":
      className =
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-100";
      variant = "outline";
      break;
    default:
      variant = "secondary";
  }

  return (
    <Badge variant={variant} className={className}>
      {action}
    </Badge>
  );
}

export function AuditTable() {
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Close expanded rows when filters or page change
  useEffect(() => { setExpandedRows(new Set()); }, [entity, action, actorId, dateFrom, dateTo, page, pageSize]);

  const {
    data: auditData,
    isLoading,
    isError,
  } = useAuditLogs({
    entity: entity || undefined,
    action: action || undefined,
    actorId: actorId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    pageSize,
  });

  const { data: actors = [] } = useAuditActors();

  const items = auditData?.items ?? [];
  const total = auditData?.total ?? 0;
  const totalPages = auditData?.totalPages ?? 0;

  const handleReset = () => {
    setEntity("");
    setAction("");
    setActorId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  const hasActiveFilters = entity || action || actorId || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Entitate</Label>
          <Select
            value={entity}
            onValueChange={(v) => {
              setEntity(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Toate entitatile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate entitatile</SelectItem>
              {ENTITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Actiune</Label>
          <Select
            value={action}
            onValueChange={(v) => {
              setAction(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Toate actiunile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate actiunile</SelectItem>
              {ACTION_OPTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Utilizator</Label>
          <Select
            value={actorId}
            onValueChange={(v) => {
              setActorId(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Toti utilizatorii" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toti utilizatorii</SelectItem>
              {actors.map((actor) => (
                <SelectItem key={actor.id} value={actor.id}>
                  {actor.lastName} {actor.firstName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">De la</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Pana la</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
          />
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            title="Reseteaza filtrele"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="py-4 text-center text-sm text-destructive">
          Nu s-au putut incarca datele de audit. Incearca din nou.
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Utilizator</TableHead>
                <TableHead>Entitate</TableHead>
                <TableHead>Actiune</TableHead>
                <TableHead className="w-[100px]">Detalii</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nu exista inregistrari de audit.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row: AuditLogEntry) => (
                  <AuditRow
                    key={row.id}
                    row={row}
                    isExpanded={expandedRows.has(row.id)}
                    onToggle={() => toggleRow(row.id)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !isError && totalPages > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {page} din {totalPages} ({total} total)
          </p>
          <div className="flex items-center gap-2">
            <div className="space-y-1">
              <Select
                value={pageSize.toString()}
                onValueChange={(v) => {
                  setPageSize(parseInt(v, 10));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevPage}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextPage}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditRow({
  row,
  isExpanded,
  onToggle,
}: {
  row: AuditLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasDiff = row.before !== null || row.after !== null;

  return (
    <>
      <TableRow>
        <TableCell className="whitespace-nowrap">
          {formatDate(row.timestamp)}
        </TableCell>
        <TableCell className="font-medium">
          {row.actor.lastName} {row.actor.firstName}
        </TableCell>
        <TableCell>{row.entity}</TableCell>
        <TableCell>{getActionBadge(row.action)}</TableCell>
        <TableCell>
          {hasDiff && (
            <Button variant="ghost" size="icon" onClick={onToggle}>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
              />
            </Button>
          )}
        </TableCell>
      </TableRow>
      {hasDiff && (
        <TableRow>
          <TableCell colSpan={5} className="!p-0 !border-0">
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-in-out"
              style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="bg-muted/30 p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-semibold text-muted-foreground">
                        Inainte
                      </p>
                      <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                        {row.before
                          ? JSON.stringify(row.before, null, 2)
                          : "\u2014"}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold text-muted-foreground">
                        Dupa
                      </p>
                      <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                        {row.after
                          ? JSON.stringify(row.after, null, 2)
                          : "\u2014"}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
