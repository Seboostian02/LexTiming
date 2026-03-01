"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { Clock, LogOut } from "lucide-react";
import { navItems } from "./nav-items";
import { Button } from "@/components/ui/button";

export function MobileNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <div className="flex flex-col h-full bg-[#2c3e50]">
      <div className="flex items-center gap-2 h-16 px-6 border-b border-[#374b5e]">
        <Clock className="h-6 w-6 text-[#f9e531]" />
        <span className="font-bold text-lg text-white">LexTiming</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-[#f9e531]/15 text-[#f9e531]"
                  : "text-slate-300 hover:bg-[#374b5e] hover:text-white"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#f9e531] rounded-r-full" />
              )}
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  isActive
                    ? "text-[#f9e531]"
                    : "text-slate-400 group-hover:text-white"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="border-t border-[#374b5e] p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs text-slate-400 capitalize">
                {user.role.toLowerCase()}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-300 hover:bg-[#374b5e] hover:text-white"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
