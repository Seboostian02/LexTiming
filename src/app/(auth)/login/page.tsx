"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
import { Clock, Eye, EyeOff, Shield, Users, UserCheck, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DEMO_ACCOUNTS = [
  {
    role: "Admin",
    icon: Shield,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    accounts: [
      { name: "Admin System", email: "admin@lextiming.com", password: "admin123", department: "IT" },
    ],
  },
  {
    role: "Manager",
    icon: Users,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    accounts: [
      { name: "Maria Popescu", email: "maria@lextiming.com", password: "manager123", department: "HR" },
      { name: "Andrei Ionescu", email: "andrei@lextiming.com", password: "manager123", department: "Engineering" },
    ],
  },
  {
    role: "Employee",
    icon: UserCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    accounts: [
      { name: "Ion Vasilescu", email: "ion@lextiming.com", password: "employee123", department: "HR" },
      { name: "Elena Dumitrescu", email: "elena@lextiming.com", password: "employee123", department: "HR" },
      { name: "George Marin", email: "george@lextiming.com", password: "employee123", department: "HR" },
      { name: "Ana Stanescu", email: "ana@lextiming.com", password: "employee123", department: "Engineering" },
      { name: "Mihai Georgescu", email: "mihai@lextiming.com", password: "employee123", department: "Engineering" },
      { name: "Diana Popa", email: "diana@lextiming.com", password: "employee123", department: "Engineering" },
    ],
  },
] as const;

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  const fillAccount = (accountEmail: string, accountPassword: string) => {
    setEmail(accountEmail);
    setPassword(accountPassword);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#2c3e50]">
            <Clock className="h-6 w-6 text-[#f9e531]" />
          </div>
          <h1 className="text-2xl font-bold text-[#2c3e50] dark:text-white">LexTiming</h1>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="text-primary hover:underline font-medium"
                >
                  Register
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        <div className="mt-6">
          <Collapsible open={showDemoAccounts} onOpenChange={setShowDemoAccounts}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between text-sm text-muted-foreground hover:text-foreground"
              >
                <span>Demo Accounts</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    showDemoAccounts && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-3">
                {DEMO_ACCOUNTS.map((group) => {
                  const Icon = group.icon;
                  return (
                    <div
                      key={group.role}
                      className={`rounded-lg border p-3 ${group.bgColor} ${group.borderColor}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`h-3.5 w-3.5 ${group.color}`} />
                        <span className={`text-xs font-semibold ${group.color}`}>
                          {group.role}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {group.accounts.map((account) => (
                          <button
                            key={account.email}
                            type="button"
                            onClick={() => fillAccount(account.email, account.password)}
                            className="w-full flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-white/60 dark:hover:bg-white/10"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">
                                {account.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {account.email}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`shrink-0 text-[10px] px-1.5 py-0 ${group.badgeClass} border-0`}
                            >
                              {account.department}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <p className="text-[10px] text-muted-foreground text-center">
                  Click any account to auto-fill credentials
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
