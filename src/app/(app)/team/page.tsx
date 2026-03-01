"use client";

import { useState } from "react";
import { TeamOverview } from "@/components/team/team-overview";
import { TeamTable } from "@/components/team/team-table";
import { EmployeeCalendarDialog } from "@/components/team/employee-calendar-dialog";
import { MarkLeaveDialog } from "@/components/team/mark-leave-dialog";
import { useTeamMembers } from "@/hooks/use-team";
import type { TeamMember } from "@/types/employee";

export default function TeamPage() {
  const { data: members, isLoading, isError } = useTeamMembers();
  const [selectedEmployee, setSelectedEmployee] = useState<TeamMember | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [leaveEmployee, setLeaveEmployee] = useState<{ id: string; firstName: string; lastName: string } | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const handleEmployeeClick = (member: TeamMember) => {
    setSelectedEmployee(member);
    setCalendarOpen(true);
  };

  const handleMarkLeave = (member: TeamMember) => {
    setLeaveEmployee({ id: member.id, firstName: member.firstName, lastName: member.lastName });
    setLeaveDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your team members and their work status in real time.
        </p>
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Failed to load team data. You may not have permission to view this
            page, or there was a server error. Please try refreshing.
          </p>
        </div>
      ) : (
        <>
          <TeamOverview members={members ?? []} isLoading={isLoading} />
          <TeamTable members={members ?? []} isLoading={isLoading} onEmployeeClick={handleEmployeeClick} onMarkLeave={handleMarkLeave} />
        </>
      )}

      <EmployeeCalendarDialog
        key={selectedEmployee?.id}
        employee={selectedEmployee}
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
      />

      <MarkLeaveDialog
        key={leaveEmployee?.id}
        employee={leaveEmployee}
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
      />
    </div>
  );
}
