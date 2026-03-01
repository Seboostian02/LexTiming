"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Play, Coffee, UserX } from "lucide-react";
import { CLOCK_STATES } from "@/lib/constants";
import type { TeamMember } from "@/types/employee";

interface TeamOverviewProps {
  members: TeamMember[];
  isLoading: boolean;
}

export function TeamOverview({ members, isLoading }: TeamOverviewProps) {
  const total = members.length;
  const working = members.filter(
    (m) => m.currentStatus === CLOCK_STATES.WORKING
  ).length;
  const onBreak = members.filter(
    (m) => m.currentStatus === CLOCK_STATES.ON_BREAK
  ).length;
  const notClocked = members.filter(
    (m) =>
      m.currentStatus === CLOCK_STATES.NOT_CLOCKED ||
      m.currentStatus === CLOCK_STATES.STOPPED
  ).length;

  const cards = [
    {
      title: "Total Employees",
      value: total,
      icon: Users,
      color: "text-foreground",
      bgColor: "bg-muted",
    },
    {
      title: "Currently Working",
      value: working,
      icon: Play,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: "On Break",
      value: onBreak,
      icon: Coffee,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    },
    {
      title: "Not Clocked In",
      value: notClocked,
      icon: UserX,
      color: "text-gray-500 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-800/30",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-12 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
