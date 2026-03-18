import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, Trophy, DollarSign,
  Activity, Settings, ClipboardList, ShieldAlert,
  ArrowDownToLine, Menu, X, ChevronRight,
  TrendingUp, LogOut,
} from "lucide-react";
import { Navbar } from "./Navbar";
import { useAuth } from "@/hooks/use-auth";
import { useAdminGetStats } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";

const adminNavItems = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    color: "text-primary",
    bg: "bg-primary/15 border-primary/30",
  },
  {
    href: "/admin/matches",
    label: "Matches",
    icon: Trophy,
    color: "text-yellow-400",
    bg: "bg-yellow-500/15 border-yellow-500/30",
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    color: "text-sky-400",
    bg: "bg-sky-500/15 border-sky-500/30",
  },
  {
    href: "/admin/withdrawals",
    label: "Withdrawals",
    icon: ArrowDownToLine,
    color: "text-amber-400",
    bg: "bg-amber-500/15 border-amber-500/30",
  },
  {
    href: "/admin/bets",
    label: "All Bets",
    icon: Activity,
    color: "text-violet-400",
    bg: "bg-violet-500/15 border-violet-500/30",
  },
  {
    href: "/admin/deposits",
    label: "Deposits",
    icon: DollarSign,
    color: "text-green-400",
    bg: "bg-green-500/15 border-green-500/30",
  },
  {
    href: "/admin/logs",
    label: "System Logs",
    icon: ClipboardList,
    color: "text-blue-400",
    bg: "bg-blue-500/15 border-blue-500/30",
  },
  {
    href: "/admin/config",
    label: "Settings",
    icon: Settings,
    color: "text-gray-400",
    bg: "bg-gray-500/15 border-gray-500/30",
  },
];

function SidebarContent({ location, onNavClick }: { location: string; onNavClick?: () => void }) {
  const { data } = useAdminGetStats({ query: { refetchInterval: 30000 } });
  const d = data as any;
  const { logout } = useAuth();

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 pt-2 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <ShieldAlert className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-black text-white uppercase tracking-widest">GoalBet</p>
            <p className="text-[9px] text-primary/70 font-semibold uppercase tracking-wider">Admin Console</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-2.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">Today</p>
            <p className="text-sm font-display font-black text-primary">{formatCurrency(d?.todayRevenue ?? 0)}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-2.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">Pending</p>
            <p className={`text-sm font-display font-black ${d?.pendingWithdrawals ? "text-amber-400" : "text-white"}`}>
              {d?.pendingWithdrawals ?? 0} <span className="text-[9px] font-normal text-muted-foreground">w/d</span>
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {adminNavItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} onClick={onNavClick}>
              <div className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-150 cursor-pointer group
                ${isActive
                  ? "bg-white/[0.08] border border-white/10"
                  : "hover:bg-white/[0.04] border border-transparent"}
              `}>
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                  isActive ? item.bg : "bg-white/[0.04] border-white/[0.06] group-hover:border-white/[0.1]"
                }`}>
                  <Icon className={`h-4 w-4 ${isActive ? item.color : "text-muted-foreground group-hover:text-white"}`} />
                </div>
                <span className={`text-sm font-semibold ${isActive ? "text-white" : "text-white/60 group-hover:text-white/80"}`}>
                  {item.label}
                </span>
                {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 text-white/30" />}
                {item.href === "/admin/withdrawals" && d?.pendingWithdrawals > 0 && !isActive && (
                  <span className="ml-auto bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {d.pendingWithdrawals}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-white/5 pt-3">
        <div className="flex items-center gap-2 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl mb-2">
          <TrendingUp className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">All-time Revenue</p>
            <p className="text-sm font-display font-black text-primary truncate">{formatCurrency(d?.platformRevenue ?? 0)}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-medium"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { isAdmin, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const adminUnlocked = sessionStorage.getItem("goalbet_admin_unlocked") === "1";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin || !adminUnlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-background">
        <div className="w-20 h-20 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-6">
          <ShieldAlert className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-display font-bold text-white mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6 max-w-sm">Admin access requires authentication through the secure portal.</p>
        <Link href="/dashboard">
          <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Top navbar */}
      <div className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-md">
        <div className="flex h-14 items-center px-4 gap-3">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 text-muted-foreground"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link href="/admin" className="flex items-center gap-2 mr-auto">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="GoalBet" className="h-7 w-7 object-contain" />
            <span className="font-display font-bold text-lg text-white">Goal<span className="text-primary">Bet</span></span>
          </Link>

          <span className="hidden sm:flex items-center gap-1.5 bg-destructive/10 border border-destructive/20 text-destructive/80 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
            <ShieldAlert className="h-3 w-3" /> Admin
          </span>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-[#0d0d14] border-r border-white/[0.06] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <span className="font-display font-bold text-white">Admin Console</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent location={location} onNavClick={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-[#0d0d14] border-r border-white/[0.06] sticky top-14 h-[calc(100vh-3.5rem)] overflow-hidden">
          <SidebarContent location={location} />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
