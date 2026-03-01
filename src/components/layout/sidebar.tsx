"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useSidebar } from "@/context/sidebar-context";
import { cn } from "@/lib/utils";
import { Clock, PanelLeftClose, PanelLeft } from "lucide-react";
import { navItems } from "./nav-items";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isCollapsed, toggle } = useSidebar();

  const filteredItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden md:flex md:flex-col md:fixed md:inset-y-0 bg-[#2c3e50] z-30 transition-[width] duration-300 ease-in-out overflow-hidden",
          isCollapsed ? "md:w-16" : "md:w-64"
        )}
      >
        {/* Logo, icon pinned right */}
        <div className="flex items-center h-16 border-b border-[#374b5e] shrink-0 px-4">
          <span
            className={cn(
              "font-bold text-lg text-white whitespace-nowrap transition-all duration-300 overflow-hidden",
              isCollapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
            )}
          >
            LexTiming
          </span>
          <Clock className="h-6 w-6 text-[#f9e531] shrink-0 ml-auto" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden px-2">
          {filteredItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            const linkElement = (
              <Link
                href={item.href}
                className={cn(
                  "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200 px-2 py-2",
                  isActive
                    ? "bg-[#1a2d3d] text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                )}
              >
                <span
                  className={cn(
                    "truncate transition-all duration-300 overflow-hidden whitespace-nowrap",
                    isCollapsed
                      ? "max-w-0 opacity-0 pr-0"
                      : "max-w-[160px] opacity-100 pr-3"
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ml-auto transition-colors",
                    isActive
                      ? "bg-[#f9e531]/20"
                      : "group-hover:bg-white/[0.08]"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] transition-colors",
                      isActive
                        ? "text-[#f9e531]"
                        : "text-slate-400 group-hover:text-white"
                    )}
                  />
                </span>
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkElement}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.href}>{linkElement}</div>;
          })}
        </nav>

        {/* Collapse toggle, icon pinned right */}
        <div className="border-t border-[#374b5e]">
          <button
            onClick={toggle}
            className="flex items-center w-full px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <span
              className={cn(
                "text-xs whitespace-nowrap transition-all duration-300 overflow-hidden",
                isCollapsed ? "max-w-0 opacity-0" : "max-w-[80px] opacity-100 pr-2"
              )}
            >
              Collapse
            </span>
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4 shrink-0 ml-auto" />
            ) : (
              <PanelLeftClose className="h-4 w-4 shrink-0 ml-auto" />
            )}
          </button>
        </div>

        {/* User info, initials circle pinned right, text collapses */}
        {user && (
          (() => {
            const content = (
              <div className="border-t border-[#374b5e] px-4 py-3 flex items-center">
                <div
                  className={cn(
                    "min-w-0 transition-all duration-300 overflow-hidden",
                    isCollapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100 pr-3"
                  )}
                >
                  <div className="text-sm font-medium text-white whitespace-nowrap">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-xs text-slate-400 capitalize whitespace-nowrap">
                    {user.role.toLowerCase()}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#374b5e] flex items-center justify-center text-xs font-medium text-white shrink-0 ml-auto">
                  {user.firstName?.[0]}
                  {user.lastName?.[0]}
                </div>
              </div>
            );

            if (isCollapsed) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>{content}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {user.firstName} {user.lastName}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return content;
          })()
        )}
      </aside>
    </TooltipProvider>
  );
}
