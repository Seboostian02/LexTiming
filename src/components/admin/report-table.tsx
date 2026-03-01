"use client";

import { useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useMonthlyReport } from "@/hooks/use-reports";
import type { MonthReportRow } from "@/types/api";

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

function generateCSV(data: MonthReportRow[]): string {
  const headers = [
    "Employee Name",
    "Department",
    "Days Worked",
    "Total Hours",
    "Avg Hours/Day",
    "Overtime",
    "Absent Days",
    "Leave Days",
  ];

  const rows = data.map((row) => [
    `"${row.employeeName}"`,
    `"${row.department ?? ""}"`,
    row.totalDaysWorked.toString(),
    row.totalHours.toString(),
    row.avgHoursPerDay.toString(),
    row.overtimeHours.toString(),
    row.absentDays.toString(),
    row.leaveDays.toString(),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
    "\n"
  );

  return csvContent;
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ReportTable() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed

  const { data: reportData = [], isLoading, isError } = useMonthlyReport(year, month);

  const years = Array.from({ length: 5 }, (_, i) =>
    now.getFullYear() - 2 + i
  );

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleExportCSV = useCallback(() => {
    const monthLabel = `${MONTHS[month - 1]}_${year}`;
    const csv = generateCSV(reportData);
    downloadCSV(csv, `report_${monthLabel}.csv`);
  }, [reportData, month, year]);

  // Summary totals
  const totalDaysWorked = reportData.reduce(
    (sum, r) => sum + r.totalDaysWorked,
    0
  );
  const totalHours = reportData.reduce((sum, r) => sum + r.totalHours, 0);
  const totalOvertime = reportData.reduce(
    (sum, r) => sum + r.overtimeHours,
    0
  );
  const totalAbsent = reportData.reduce((sum, r) => sum + r.absentDays, 0);
  const totalLeave = reportData.reduce((sum, r) => sum + r.leaveDays, 0);

  return (
    <div className="space-y-4">
      {/* Month/Year selector */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Month</Label>
              <Select
                value={month.toString()}
                onValueChange={(v) => setMonth(parseInt(v, 10))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={(i + 1).toString()}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Year</Label>
              <Select
                value={year.toString()}
                onValueChange={(v) => setYear(parseInt(v, 10))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={handleExportCSV}
          disabled={reportData.length === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
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
          Failed to load report data. Please try again.
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Days Worked</TableHead>
                <TableHead className="text-right">Total Hours</TableHead>
                <TableHead className="text-right">Avg Hours/Day</TableHead>
                <TableHead className="text-right">Overtime</TableHead>
                <TableHead className="text-right">Absent Days</TableHead>
                <TableHead className="text-right">Leave Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No report data for this month.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {reportData.map((row) => (
                    <TableRow key={row.employeeId}>
                      <TableCell className="font-medium">
                        {row.employeeName}
                      </TableCell>
                      <TableCell>{row.department ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        {row.totalDaysWorked}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.totalHours}h
                      </TableCell>
                      <TableCell className="text-right">
                        {row.avgHoursPerDay}h
                      </TableCell>
                      <TableCell className="text-right">
                        {row.overtimeHours > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            {row.overtimeHours}h
                          </span>
                        ) : (
                          "0h"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.absentDays > 0 ? (
                          <span className="text-red-600 dark:text-red-400">
                            {row.absentDays}
                          </span>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.leaveDays}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Summary row */}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell>Total ({reportData.length} employees)</TableCell>
                    <TableCell />
                    <TableCell className="text-right">
                      {totalDaysWorked}
                    </TableCell>
                    <TableCell className="text-right">
                      {Math.round(totalHours * 100) / 100}h
                    </TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">
                      {Math.round(totalOvertime * 100) / 100}h
                    </TableCell>
                    <TableCell className="text-right">{totalAbsent}</TableCell>
                    <TableCell className="text-right">{totalLeave}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
