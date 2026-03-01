"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, UserX, UserCheck, Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { Employee } from "@/types/employee";

interface EmployeeTableProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onToggleStatus: (employee: Employee) => void;
  isLoading: boolean;
}

const columnHelper = createColumnHelper<Employee>();

function getRoleBadgeClass(role: string): string {
  switch (role) {
    case "ADMIN":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100";
    case "MANAGER":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-100";
    default:
      return "";
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100";
    case "INACTIVE":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100";
    default:
      return "";
  }
}

export function EmployeeTable({
  employees,
  onEdit,
  onToggleStatus,
  isLoading,
}: EmployeeTableProps) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo(
    () => [
      columnHelper.accessor(
        (row) => `${row.firstName} ${row.lastName}`,
        {
          id: "name",
          header: "Name",
          cell: (info) => (
            <span className="font-medium">{info.getValue()}</span>
          ),
        }
      ),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => (
          <span className="text-muted-foreground">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("role", {
        header: "Role",
        cell: (info) => {
          const role = info.getValue();
          const badgeClass = getRoleBadgeClass(role);
          return (
            <Badge variant={role === "EMPLOYEE" ? "secondary" : "outline"} className={badgeClass}>
              {role}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("department", {
        header: "Department",
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor(
        (row) =>
          row.manager
            ? `${row.manager.firstName} ${row.manager.lastName}`
            : null,
        {
          id: "manager",
          header: "Manager",
          cell: (info) => info.getValue() || "-",
        }
      ),
      columnHelper.accessor(
        (row) => row.schedule?.name ?? null,
        {
          id: "schedule",
          header: "Schedule",
          cell: (info) => info.getValue() || "-",
        }
      ),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue();
          return (
            <Badge variant="outline" className={getStatusBadgeClass(status)}>
              {status}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const employee = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(employee)}
                title="Edit employee"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleStatus(employee)}
                title={
                  employee.status === "ACTIVE"
                    ? "Deactivate employee"
                    : "Activate employee"
                }
              >
                {employee.status === "ACTIVE" ? (
                  <UserX className="h-4 w-4 text-red-500" />
                ) : (
                  <UserCheck className="h-4 w-4 text-green-500" />
                )}
              </Button>
            </div>
          );
        },
      }),
    ],
    [onEdit, onToggleStatus]
  );

  const table = useReactTable({
    data: employees,
    columns,
    state: {
      columnFilters,
      globalFilter,
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const search = filterValue.toLowerCase();
      const name =
        `${row.original.firstName} ${row.original.lastName}`.toLowerCase();
      const email = row.original.email.toLowerCase();
      return name.includes(search) || email.includes(search);
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
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
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No employees found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()} ({table.getFilteredRowModel().rows.length}{" "}
            total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
