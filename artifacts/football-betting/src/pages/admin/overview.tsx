import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminGetStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { Users, Activity, DollarSign, Wallet, Trophy, AlertCircle, TrendingUp, BarChart2 } from "lucide-react";

export default function AdminOverview() {
  const { data, isLoading } = useAdminGetStats({ query: { refetchInterval: 10000 } });

  const todayCards = [
    {
      title: "Today's Revenue",
      value: formatCurrency((data as any)?.todayRevenue ?? 0),
      icon: TrendingUp,
      color: "text-primary",
      desc: "Net profit since midnight",
    },
    {
      title: "Today's Bets",
      value: (data as any)?.todayBets ?? 0,
      icon: BarChart2,
      color: "text-yellow-400",
      desc: "Individual selections placed today",
    },
  ];

  const allTimeCards = [
    { title: "Total Users", value: data?.totalUsers, icon: Users, desc: `${data?.activeUsers || 0} active` },
    { title: "Platform Revenue", value: formatCurrency(data?.platformRevenue || 0), icon: DollarSign, color: "text-primary" },
    { title: "Total Bets", value: data?.totalBets, icon: Activity },
    { title: "Total Bet Amount", value: formatCurrency(data?.totalBetAmount || 0), icon: Wallet },
    { title: "Pending Withdrawals", value: data?.pendingWithdrawals, icon: AlertCircle, color: data?.pendingWithdrawals ? "text-destructive" : "" },
    { title: "Live Matches", value: data?.liveMatches, icon: Trophy, color: data?.liveMatches ? "text-primary animate-pulse" : "" },
  ];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-white">Platform Overview</h1>
      </div>

      {/* Today's stats — highlighted */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {todayCards.map((stat, i) => (
          <Card key={i} className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color || "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-display font-bold ${stat.color || "text-white"}`}>
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
              <div className="text-3xl font-display font-bold">
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
