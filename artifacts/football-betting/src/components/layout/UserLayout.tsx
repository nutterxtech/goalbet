import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Trophy, History, ArrowLeftRight, Activity, Bell, Sparkles, Wallet } from "lucide-react";
import { Navbar } from "./Navbar";
import { useAuth } from "@/hooks/use-auth";
import { useGetBalance } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";

const navItems = [
  {
    href: "/dashboard",
    label: "Matches",
    icon: Activity,
    color: "text-sky-400",
    bg: "bg-sky-500/20 border-sky-500/30",
    activeBg: "bg-sky-500/20 border-sky-500/50",
    glow: "shadow-[0_0_16px_rgba(14,165,233,0.25)]",
    dot: "bg-sky-400",
  },
  {
    href: "/dashboard/my-bets",
    label: "My Bets",
    icon: History,
    color: "text-violet-400",
    bg: "bg-violet-500/20 border-violet-500/30",
    activeBg: "bg-violet-500/20 border-violet-500/50",
    glow: "shadow-[0_0_16px_rgba(139,92,246,0.25)]",
    dot: "bg-violet-400",
  },
  {
    href: "/dashboard/transactions",
    label: "Wallet",
    icon: ArrowLeftRight,
    color: "text-amber-400",
    bg: "bg-amber-500/20 border-amber-500/30",
    activeBg: "bg-amber-500/20 border-amber-500/50",
    glow: "shadow-[0_0_16px_rgba(245,158,11,0.25)]",
    dot: "bg-amber-400",
  },
  {
    href: "/dashboard/notifications",
    label: "Notifications",
    icon: Bell,
    color: "text-pink-400",
    bg: "bg-pink-500/20 border-pink-500/30",
    activeBg: "bg-pink-500/20 border-pink-500/50",
    glow: "shadow-[0_0_16px_rgba(236,72,153,0.25)]",
    dot: "bg-pink-400",
  },
  {
    href: "/dashboard/leaderboard",
    label: "Leaderboard",
    icon: Trophy,
    color: "text-yellow-400",
    bg: "bg-yellow-500/20 border-yellow-500/30",
    activeBg: "bg-yellow-500/20 border-yellow-500/50",
    glow: "shadow-[0_0_16px_rgba(234,179,8,0.25)]",
    dot: "bg-yellow-400",
  },
  {
    href: "/dashboard/lucky-wheel",
    label: "Lucky Wheel",
    icon: Sparkles,
    color: "text-primary",
    bg: "bg-primary/20 border-primary/30",
    activeBg: "bg-primary/20 border-primary/50",
    glow: "shadow-[0_0_16px_rgba(0,230,92,0.3)]",
    dot: "bg-primary",
    isNew: true,
  },
];

export function UserLayout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { user, isAdmin, isLoading } = useAuth();

  const { data: balanceData } = useGetBalance({
    query: { enabled: !!user, refetchInterval: 5000 },
  });

  useEffect(() => {
    if (!isLoading && isAdmin) navigate("/admin");
  }, [isAdmin, isLoading, navigate]);

  const balance = balanceData?.balance ?? user?.balance ?? 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">

        {/* ── Sidebar ── */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-3">

          {/* Balance card — desktop only */}
          {user && (
            <div className="hidden md:block bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-2xl p-4 shadow-[0_0_24px_rgba(0,230,92,0.12)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Balance</p>
                  <p className="font-display font-black text-lg text-primary leading-none">{formatCurrency(balance)}</p>
                </div>
              </div>
              <Link href="/dashboard/transactions">
                <button className="w-full text-xs font-bold py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_12px_rgba(0,230,92,0.3)] hover:shadow-[0_0_18px_rgba(0,230,92,0.5)]">
                  Deposit / Withdraw
                </button>
              </Link>
            </div>
          )}

          {/* Nav links */}
          <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-1 md:pb-0 hide-scrollbar">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-xl border font-medium transition-all duration-200 cursor-pointer whitespace-nowrap
                      ${isActive
                        ? `${item.activeBg} ${item.glow}`
                        : "border-border/30 bg-card/50 hover:border-border/60 hover:bg-card hover:scale-[1.02]"
                      }
                    `}
                  >
                    {/* Always-colored icon bubble */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all ${item.bg}`}>
                      <Icon className={`h-4 w-4 ${item.color}`} />
                    </div>

                    <span className={`text-sm font-semibold ${isActive ? item.color : "text-white/80"}`}>
                      {item.label}
                    </span>

                    {item.isNew && !isActive && (
                      <span className="ml-auto text-[9px] font-black bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full tracking-wide">NEW</span>
                    )}
                    {isActive && (
                      <div className={`ml-auto w-1.5 h-1.5 rounded-full ${item.dot} shrink-0`} />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Help box — desktop */}
          <div className="hidden md:block mt-auto pt-2 border-t border-border/30">
            <div className="bg-card/50 border border-border/40 rounded-xl p-3 text-xs text-muted-foreground leading-relaxed">
              <p className="font-semibold text-white mb-1">⚽ How to play</p>
              <p>Pick matches → build a slip → place your bet → cash out winnings instantly.</p>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0">
          {children}
        </div>

      </main>
    </div>
  );
}
