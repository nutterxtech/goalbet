import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminGetStats } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import {
  Users, DollarSign, Wallet, Trophy, AlertCircle,
  TrendingUp, Zap, Percent, Activity, ArrowUpRight,
  ArrowDownRight, Clock, BarChart3,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
  trend,
  highlight,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: any;
  color: string;
  trend?: "up" | "down" | "neutral";
  highlight?: boolean;
}) {
  return (
    <div className={`relative rounded-2xl border p-4 flex flex-col gap-3 overflow-hidden ${
      highlight
        ? "bg-primary/8 border-primary/25"
        : "bg-white/[0.03] border-white/[0.07]"
    }`}>
      {highlight && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,230,92,0.08)_0%,_transparent_65%)] pointer-events-none" />
      )}
      <div className="flex items-start justify-between relative">
        <p className="text-xs text-muted-foreground font-medium leading-tight">{title}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          highlight ? "bg-primary/15 border border-primary/25" : "bg-white/[0.06] border border-white/[0.08]"
        }`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
      <div className="relative">
        <p className={`text-2xl font-display font-black leading-none ${color}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 mt-1.5 leading-relaxed">{sub}</p>}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[10px] font-semibold ${
          trend === "up" ? "text-primary" : trend === "down" ? "text-red-400" : "text-muted-foreground"
        }`}>
          {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : trend === "down" ? <ArrowDownRight className="h-3 w-3" /> : null}
          {trend === "up" ? "Positive" : trend === "down" ? "Negative" : "Neutral"}
        </div>
      )}
    </div>
  );
}

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#111118] border border-white/10 rounded-xl px-3 py-2.5 text-xs shadow-xl">
        <p className="text-muted-foreground mb-1 font-semibold">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="font-bold">
            {p.name}: {typeof p.value === "number" ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminOverview() {
  const { data, isLoading } = useAdminGetStats({ query: { refetchInterval: 15000 } });
  const d = data as any;

  const bettingRev = d?.bettingRevenue ?? 0;
  const spinRev = d?.spinRevenue ?? 0;
  const feeRev = d?.withdrawalFeeRevenue ?? 0;
  const totalRev = d?.platformRevenue ?? 0;

  const revenueBreakdown = [
    { name: "Betting", value: Math.max(0, bettingRev), fill: "#22c55e" },
    { name: "Wheel", value: Math.max(0, spinRev), fill: "#8b5cf6" },
    { name: "W/D Fees", value: Math.max(0, feeRev), fill: "#f59e0b" },
  ].filter((r) => r.value > 0);

  const todayComparison = [
    { label: "Betting", today: d?.todayBettingRevenue ?? 0, allTime: Math.max(0, bettingRev), fill: "#22c55e" },
    { label: "Wheel", today: d?.todaySpinRevenue ?? 0, allTime: Math.max(0, spinRev), fill: "#8b5cf6" },
    { label: "Fees", today: d?.todayWithdrawalFeeRevenue ?? 0, allTime: Math.max(0, feeRev), fill: "#f59e0b" },
  ];

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-black text-white">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Live metrics — auto-refreshes every 15s</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Live
        </div>
      </div>

      {/* TODAY'S HIGHLIGHTS */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Today's Performance</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <StatCard
            title="Total Revenue Today"
            value={isLoading ? "—" : formatCurrency(d?.todayRevenue ?? 0)}
            icon={TrendingUp}
            color="text-primary"
            trend={d?.todayRevenue > 0 ? "up" : "neutral"}
            highlight
          />
          <StatCard
            title="Bets Placed"
            value={isLoading ? "—" : d?.todayBets ?? 0}
            sub="Selections today"
            icon={Activity}
            color="text-yellow-400"
          />
          <StatCard
            title="Betting Revenue"
            value={isLoading ? "—" : formatCurrency(d?.todayBettingRevenue ?? 0)}
            icon={DollarSign}
            color="text-green-400"
            trend={d?.todayBettingRevenue >= 0 ? "up" : "down"}
          />
          <StatCard
            title="Wheel Revenue"
            value={isLoading ? "—" : formatCurrency(d?.todaySpinRevenue ?? 0)}
            icon={Zap}
            color="text-violet-400"
            trend={d?.todaySpinRevenue >= 0 ? "up" : "down"}
          />
          <StatCard
            title="W/D Fee Revenue"
            value={isLoading ? "—" : formatCurrency(d?.todayWithdrawalFeeRevenue ?? 0)}
            icon={Percent}
            color="text-amber-400"
          />
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

        {/* Revenue breakdown pie */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-white">All-time Revenue Split</p>
          </div>
          {isLoading || totalRev <= 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              {isLoading ? "Loading…" : "No revenue data yet"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={revenueBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {revenueBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CUSTOM_TOOLTIP />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap gap-3 justify-center mt-1">
            {[
              { label: "Betting", color: "#22c55e" },
              { label: "Wheel", color: "#8b5cf6" },
              { label: "W/D Fees", color: "#f59e0b" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Today vs All-time bar */}
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-white">Revenue by Category</p>
            <div className="ml-auto flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary/70" />Today</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-white/20" />All-time</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={todayComparison} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fill: "#666", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CUSTOM_TOOLTIP />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="today" name="Today" radius={[4, 4, 0, 0]}>
                {todayComparison.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
                ))}
              </Bar>
              <Bar dataKey="allTime" name="All-time" radius={[4, 4, 0, 0]}>
                {todayComparison.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} fillOpacity={0.22} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ALL-TIME STATS GRID */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">All-time Metrics</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <StatCard
            title="Platform Revenue"
            value={isLoading ? "—" : formatCurrency(d?.platformRevenue ?? 0)}
            sub="Betting + Wheel + Fees"
            icon={DollarSign}
            color={totalRev >= 0 ? "text-primary" : "text-red-400"}
            trend={totalRev >= 0 ? "up" : "down"}
            highlight
          />
          <StatCard
            title="Total Users"
            value={isLoading ? "—" : d?.totalUsers ?? 0}
            sub={`${d?.activeUsers ?? 0} active`}
            icon={Users}
            color="text-sky-400"
          />
          <StatCard
            title="Betting Revenue"
            value={isLoading ? "—" : formatCurrency(bettingRev)}
            sub={`${formatCurrency(d?.totalBetAmount ?? 0)} staked`}
            icon={TrendingUp}
            color={bettingRev >= 0 ? "text-green-400" : "text-red-400"}
            trend={bettingRev >= 0 ? "up" : "down"}
          />
          <StatCard
            title="Wheel Revenue"
            value={isLoading ? "—" : formatCurrency(spinRev)}
            sub={`${formatCurrency(d?.totalSpinWon ?? 0)} won by users`}
            icon={Zap}
            color={spinRev >= 0 ? "text-violet-400" : "text-red-400"}
            trend={spinRev >= 0 ? "up" : "down"}
          />
          <StatCard
            title="W/D Fee Revenue"
            value={isLoading ? "—" : formatCurrency(feeRev)}
            sub="From approved withdrawals"
            icon={Percent}
            color="text-amber-400"
          />
          <StatCard
            title="Total Bets"
            value={isLoading ? "—" : d?.totalBets ?? 0}
            sub="Individual selections"
            icon={Activity}
            color="text-yellow-400"
          />
          <StatCard
            title="Total Bet Amount"
            value={isLoading ? "—" : formatCurrency(d?.totalBetAmount ?? 0)}
            sub="Gross amount wagered"
            icon={Wallet}
            color="text-blue-400"
          />
          <StatCard
            title="Winnings Paid"
            value={isLoading ? "—" : formatCurrency(d?.totalWinningsPaid ?? 0)}
            sub="Total match payouts"
            icon={Trophy}
            color="text-orange-400"
          />
          <StatCard
            title="Pending Withdrawals"
            value={isLoading ? "—" : d?.pendingWithdrawals ?? 0}
            sub="Awaiting approval"
            icon={AlertCircle}
            color={d?.pendingWithdrawals ? "text-amber-400" : "text-muted-foreground"}
          />
          <StatCard
            title="Live Matches"
            value={isLoading ? "—" : d?.liveMatches ?? 0}
            sub="Currently in-play"
            icon={Trophy}
            color={d?.liveMatches ? "text-primary" : "text-muted-foreground"}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
