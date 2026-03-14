import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminGetStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { Users, Activity, DollarSign, Wallet, Trophy, AlertCircle } from "lucide-react";

export default function AdminOverview() {
  const { data, isLoading } = useAdminGetStats({ query: { refetchInterval: 10000 } });

  const statCards = [
    { title: "Total Users", value: data?.totalUsers, icon: Users, desc: `${data?.activeUsers || 0} active` },
    { title: "Platform Revenue", value: formatCurrency(data?.platformRevenue || 0), icon: DollarSign, color: "text-primary" },
    { title: "Total Bets", value: data?.totalBets, icon: Activity },
    { title: "Total Bet Amount", value: formatCurrency(data?.totalBetAmount || 0), icon: Wallet },
    { title: "Pending Withdrawals", value: data?.pendingWithdrawals, icon: AlertCircle, color: data?.pendingWithdrawals ? "text-destructive" : "" },
    { title: "Live Matches", value: data?.liveMatches, icon: Trophy, color: data?.liveMatches ? "text-primary animate-pulse" : "" },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Platform Overview</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, i) => (
          <Card key={i} className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color || 'text-muted-foreground'}`} />
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
