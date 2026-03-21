import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import { API_BASE } from "@/lib/api";
import {
  ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock,
  Receipt, Trophy, Search, Loader2,
} from "lucide-react";

const statusColors: Record<string, string> = {
  pending:  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  won:      "bg-green-500/20 text-green-400 border-green-500/30",
  lost:     "bg-red-500/20 text-red-400 border-red-500/30",
  refunded: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

function selIcon(status: string) {
  if (status === "won")  return <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />;
  if (status === "lost") return <XCircle      className="w-3.5 h-3.5 text-red-400   shrink-0" />;
  return                        <Clock        className="w-3.5 h-3.5 text-primary   shrink-0" />;
}

function outcomeLabel(o: string, home: string, away: string) {
  return o === "home" ? `${home} Win` : o === "away" ? `${away} Win` : "Draw";
}

interface Selection {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  outcome: "home" | "draw" | "away";
  odds: number;
  status: string;
  matchResult?: string;
}

interface AdminSlip {
  id: string;
  slipId: string;
  userId: string;
  username: string;
  selections: Selection[];
  combinedOdds: number;
  stake: number;
  potentialWinnings: number;
  actualWinnings: number;
  status: string;
  createdAt: string;
  settledAt?: string;
}

function SlipRow({ slip }: { slip: AdminSlip }) {
  const [open, setOpen] = useState(false);
  const wonCount  = slip.selections.filter(s => s.status === "won").length;
  const lostCount = slip.selections.filter(s => s.status === "lost").length;

  return (
    <>
      <tr
        className="border-b border-border/30 hover:bg-white/[0.03] cursor-pointer transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <td className="py-3 px-3">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
            <span className="font-mono font-bold text-white text-sm">#{slip.slipId}</span>
          </div>
        </td>
        <td className="py-3 px-3 text-muted-foreground text-sm">{slip.username}</td>
        <td className="py-3 px-3 text-center">
          <span className="text-xs text-muted-foreground">
            {slip.selections.length} sel ·{" "}
            <span className="text-green-400">{wonCount}✓</span>
            {lostCount > 0 && <span className="text-red-400 ml-1">{lostCount}✗</span>}
          </span>
        </td>
        <td className="py-3 px-3 text-right font-mono text-white">{slip.combinedOdds.toFixed(3)}x</td>
        <td className="py-3 px-3 text-right text-white font-medium">{formatCurrency(slip.stake)}</td>
        <td className="py-3 px-3 text-right">
          {slip.status === "won"
            ? <span className="text-green-400 font-bold">{formatCurrency(slip.actualWinnings ?? 0)}</span>
            : slip.status === "pending"
            ? <span className="text-primary">{formatCurrency(slip.potentialWinnings)}</span>
            : <span className="text-red-400">—</span>}
        </td>
        <td className="py-3 px-3 text-center">
          <Badge className={`text-xs ${statusColors[slip.status] || ""}`}>{slip.status}</Badge>
        </td>
        <td className="py-3 px-3 text-right text-muted-foreground text-xs">
          {new Date(slip.createdAt).toLocaleDateString()}
        </td>
      </tr>

      {open && (
        <tr className="bg-secondary/10">
          <td colSpan={8} className="px-6 py-3">
            <div className="space-y-1.5">
              {slip.selections.map((sel, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border text-sm ${
                    sel.status === "won" ? "border-green-500/30 bg-green-500/5" :
                    sel.status === "lost" ? "border-red-500/30 bg-red-500/5" :
                    "border-border/40 bg-secondary/20"
                  }`}
                >
                  {selIcon(sel.status)}
                  <div className="flex-1 min-w-0">
                    <span className="text-muted-foreground text-xs">{sel.homeTeam} vs {sel.awayTeam}</span>
                    <span className="mx-2 text-white font-semibold">{outcomeLabel(sel.outcome, sel.homeTeam, sel.awayTeam)}</span>
                    {sel.matchResult && sel.status !== "pending" && (
                      <span className="text-xs text-muted-foreground">
                        Result: {outcomeLabel(sel.matchResult, sel.homeTeam, sel.awayTeam)}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-sm font-bold text-white">{sel.odds.toFixed(2)}x</span>
                </div>
              ))}

              <div className="flex items-center gap-6 pt-2 text-xs text-muted-foreground border-t border-border/20 mt-1">
                <span>Placed: {formatDate(slip.createdAt)}</span>
                {slip.settledAt && <span>Settled: {formatDate(slip.settledAt)}</span>}
                <span>User ID: {slip.userId}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminBets() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [slips, setSlips] = useState<AdminSlip[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchSlips = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("goalbet_token");
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (status !== "all") params.set("status", status);
      const resp = await fetch(`${API_BASE}/admin/slips?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setSlips(data.slips);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { fetchSlips(); }, [fetchSlips]);

  const filtered = search.trim()
    ? slips.filter(s => s.slipId.toLowerCase().includes(search.toLowerCase()) || s.username.toLowerCase().includes(search.toLowerCase()))
    : slips;

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Bet Slips</h1>
        <p className="text-muted-foreground mt-1">All accumulator slips — expand each row to see individual game picks</p>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <CardTitle className="text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Slips <span className="text-muted-foreground font-normal text-base">({total})</span>
            </CardTitle>
            <div className="flex gap-2 sm:ml-auto flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Slip ID or user…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 w-44 bg-background text-sm border-border"
                />
              </div>
              <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-32 bg-background border-border text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
              No slips found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/50 text-xs uppercase tracking-wide">
                    <th className="text-left py-3 px-3">Slip ID</th>
                    <th className="text-left py-3 px-3">User</th>
                    <th className="text-center py-3 px-3">Games</th>
                    <th className="text-right py-3 px-3">Odds</th>
                    <th className="text-right py-3 px-3">Stake</th>
                    <th className="text-right py-3 px-3">Payout</th>
                    <th className="text-center py-3 px-3">Status</th>
                    <th className="text-right py-3 px-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(slip => <SlipRow key={slip.id} slip={slip} />)}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/30">
            <span className="text-muted-foreground text-sm">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
