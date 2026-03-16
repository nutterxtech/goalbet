import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminGetStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import {
  Users, Activity, DollarSign, Wallet, Trophy, AlertCircle,
  TrendingUp, BarChart2, Zap, TrendingDown,
} from "lucide-react";

export default function AdminOverview() {
  const { data, isLoading } = useAdminGetStats({ query: { refetchInterval: 10000 } });

  const d = data as any;

  const todayCards = [
    {
      title: "Today's Total Revenue",
      value: formatCurrency(d?.todayRevenue ?? 0),
      icon: TrendingUp,
      color: "text-primary",
      desc: "Betting + Lucky Wheel net since midnight",
      highlight: true,
    },
    {
      title: "Today's Bets",
      value: d?.todayBets ?? 0,
      icon: BarChart2,
      color: "text-yellow-400",
      desc: "Individual selections placed today",
      highlight: true,
    },
    {
      title: "Today's Betting Revenue",
      value: formatCurrency(d?.todayBettingRevenue ?? 0),
      icon: DollarSign,
      color: "text-green-400",
      desc: "Match bets collected minus winnings paid",
      highlight: false,
    },
    {
      title: "Today's Wheel Revenue",
      value: formatCurrency(d?.todaySpinRevenue ?? 0),
      icon: Zap,
      color: "text-violet-400",
      desc: "Lucky Wheel stakes minus payouts",
      highlight: false,
    },
  ];

  const allTimeCards = [
    {
      title: "Total Users",
      value: d?.totalUsers,
      icon: Users,
      desc: `${d?.activeUsers || 0} active`,
    },
    {
      title: "Platform Revenue",
      value: formatCurrency(d?.platformRevenue ?? 0),
      icon: DollarSign,
      color: (d?.platformRevenue ?? 0) >= 0 ? "text-primary" : "text-red-400",
      desc: "All-time betting + wheel net profit",
    },
    {
      title: "Betting Revenue",
      value: formatCurrency(d?.bettingRevenue ?? 0),
      icon: TrendingUp,
      color: (d?.bettingRevenue ?? 0) >= 0 ? "text-green-400" : "text-red-400",
      desc: `KSh ${(d?.totalBetAmount ?? 0).toLocaleString()} staked − KSh ${(d?.totalWinningsPaid ?? 0).toLocaleString()} wins − KSh ${(d?.totalRefundsPaid ?? 0).toLocaleString()} refunds`,
    },
    {
      title: "Lucky Wheel Revenue",
      value: formatCurrency(d?.spinRevenue ?? 0),
      icon: Zap,
      color: (d?.spinRevenue ?? 0) >= 0 ? "text-violet-400" : "text-red-400",
      desc: `KSh ${(d?.totalSpinStaked ?? 0).toLocaleString()} staked · KSh ${(d?.totalSpinWon ?? 0).toLocaleString()} won`,
    },
    {
      title: "Total Bets",
      value: d?.totalBets,
      icon: Activity,
    },
    {
      title: "Total Bet Amount",
      value: formatCurrency(d?.totalBetAmount ?? 0),
      icon: Wallet,
    },
    {
      title: "Pending Withdrawals",
      value: d?.pendingWithdrawals,
      icon: AlertCircle,
      color: d?.pendingWithdrawals ? "text-destructive" : "",
    },
    {
      title: "Live Matches",
      value: d?.liveMatches,
      icon: Trophy,
      color: d?.liveMatches ? "text-primary animate-pulse" : "",
    },
    {
      title: "Total Winnings Paid",
      value: formatCurrency(d?.totalWinningsPaid ?? 0),
      icon: TrendingDown,
      color: "text-orange-400",
      desc: "All match winnings ever paid out",
    },
  ];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-white">Platform Overview</h1>
      </div>

      {/* Today's stats */}
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-3">Today</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {todayCards.map((stat, i) => (
          <Card
            key={i}
            className={stat.highlight ? "bg-primary/5 border-primary/20" : "bg-card/50 border-border/50"}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color || "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-display font-bold ${stat.color || "text-white"}`}>
                {isLoading ? "-" : stat.value}
              </div>
              {stat.desc && <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* All-time stats */}
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-3">All Time</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {allTimeCards.map((stat, i) => (
          <Card key={i} className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color || "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-display font-bold ${stat.color || "text-white"}`}>
                {isLoading ? "-" : stat.value}
              </div>
              {stat.desc && <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
