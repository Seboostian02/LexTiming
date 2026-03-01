import {
  LayoutDashboard,
  Calendar,
  Users,
  Inbox,
  UserCog,
  Settings,
  Lock,
  BarChart3,
  ScrollText,
  User,
} from "lucide-react";
import { ROLES } from "@/lib/constants";
import type { ComponentType } from "react";

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  roles: string[];
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: [ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ADMIN] },
  { label: "Calendar", href: "/calendar", icon: Calendar, roles: [ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ADMIN] },
  { label: "Team", href: "/team", icon: Users, roles: [ROLES.MANAGER, ROLES.ADMIN] },
  { label: "Approvals", href: "/approvals", icon: Inbox, roles: [ROLES.MANAGER, ROLES.ADMIN] },
  { label: "Employees", href: "/admin/employees", icon: UserCog, roles: [ROLES.ADMIN] },
  { label: "Schedules", href: "/admin/schedules", icon: Settings, roles: [ROLES.ADMIN] },
  { label: "Month Close", href: "/admin/month-close", icon: Lock, roles: [ROLES.ADMIN] },
  { label: "Reports", href: "/admin/reports", icon: BarChart3, roles: [ROLES.ADMIN] },
  { label: "Jurnal Audit", href: "/admin/audit", icon: ScrollText, roles: [ROLES.ADMIN] },
  { label: "Profile", href: "/profile", icon: User, roles: [ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ADMIN] },
];
