"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, ArrowUpDown, CalendarPlus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLOCK_STATES } from "@/lib/constants";
import type { ClockState } from "@/lib/constants";
import type { TeamMember } from "@/types/employee";

interface TeamTableProps {
  members: TeamMember[];
  isLoading: boolean;
  onEmployeeClick?: (member: TeamMember) => void;
  onMarkLeave?: (member: TeamMember) => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  [CLOCK_STATES.WORKING]: {
    label: "Working",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  [CLOCK_STATES.ON_BREAK]: {
    label: "On Break",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  [CLOCK_STATES.STOPPED]: {
    label: "Day Complete",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  [CLOCK_STATES.NOT_CLOCKED]: {
    label: "Not Clocked",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
  },
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: CLOCK_STATES.WORKING, label: "Working" },
  { value: CLOCK_STATES.ON_BREAK, label: "On Break" },
  { value: CLOCK_STATES.STOPPED, label: "Day Complete" },
  { value: CLOCK_STATES.NOT_CLOCKED, label: "Not Clocked" },
];

function StatusBadge({ status }: { status: ClockState }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG[CLOCK_STATES.NOT_CLOCKED];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

const columnHelper = createColumnHelper<TeamMember>();

export function TeamTable({ members, isLoading, onEmployeeClick, onMarkLeave }: TeamTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Compute unique departments from data
  const departments = useMemo(() => {
    const depts = new Set(members.map((m) => m.department).filter(Boolean) as string[]);
    return Array.from(depts).sort();
  }, [members]);

  // Pre-filter data based on department and status dropdowns
  const filteredMembers = useMemo(() => {
    let result = members;
    if (departmentFilter !== "all") {
      result = result.filter((m) => m.department === departmentFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((m) => m.currentStatus === statusFilter);
    }
    return result;
  }, [members, departmentFilter, statusFilter]);

  const columns = useMemo(
    () => [
      columnHelper.accessor(
        (row) => `${row.firstName} ${row.lastName}`,
        {
          id: "name",
          header: ({ column }) => (
            <button
              className="flex items-center gap-1 hover:text-foreground"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              Name
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          ),
          cell: (info) => (
            <span className="font-medium">{info.getValue()}</span>
          ),
        }
      ),
      columnHelper.accessor("email", {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Email
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: (info) => (
          <span className="text-muted-foreground">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("department", {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Department
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: (info) => info.getValue() ?? "N/A",
      }),
      columnHelper.accessor("currentStatus", {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Status
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: (info) => <StatusBadge status={info.getValue() as ClockState} />,
      }),
      columnHelper.accessor("hoursToday", {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Hours Today
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: (info) => {
          const hours = info.getValue();
          if (hours === null || hours === undefined) {
            return <span className="text-muted-foreground">--</span>;
          }
          return <span className="font-mono">{hours.toFixed(1)}h</span>;
        },
      }),
      columnHelper.accessor("anomalyCount", {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Anomalies
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        ),
        cell: (info) => {
          const count = info.getValue();
          if (count === 0) {
            return <span className="text-muted-foreground">&mdash;</span>;
          }
          return (
            <Badge
              variant="outline"
              className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
            >
              <AlertTriangle className="mr-1 h-3 w-3" />
              {count}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: (info) =>
          onMarkLeave ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                onMarkLeave(info.row.original);
              }}
              title="Mark Leave"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Leave</span>
            </Button>
          ) : null,
      }),
    ],
    [onMarkLeave]
  );

  const table = useReactTable({
    data: filteredMembers,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 w-full animate-pulse rounded bg-muted"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Team Members</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center pt-2">
          <div className="w-full sm:w-48">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              No team members found. Employees assigned to you will appear here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => onEmployeeClick?.(row.original)}
                    className={cn(onEmployeeClick && "cursor-pointer")}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
