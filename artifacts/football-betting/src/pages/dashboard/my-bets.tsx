import { useState } from "react";
import { UserLayout } from "@/components/layout/UserLayout";
import { useGetUserSlips, BetSlipResponse } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { Loader2, ChevronRight, Receipt, CheckCircle2, XCircle, Clock, Trophy, Download } from "lucide-react";

function downloadSlipAsPng(slip: BetSlipResponse) {
  const W = 400, ROW = 62, HDR = 90, SUM = 110, PAD = 30;
  const H = HDR + slip.selections.length * ROW + SUM + PAD;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2; canvas.height = H * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);

  // Background
  ctx.fillStyle = "#0d0d14"; ctx.fillRect(0, 0, W, H);

  // Top accent bar
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, "#22c55e"); g.addColorStop(1, "#16a34a");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 3);

  // Header
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 17px sans-serif";
  ctx.fillText("GoalBet", 20, 28);
  ctx.fillStyle = "#22c55e"; ctx.font = "bold 12px monospace";
  ctx.fillText(`Slip #${slip.slipId}`, 20, 46);
  ctx.fillStyle = "#6b7280"; ctx.font = "10px sans-serif";
  ctx.fillText(slip.createdAt ? new Date(slip.createdAt).toLocaleString() : "", 20, 62);

  const sCol = slip.status === "won" ? "#22c55e" : slip.status === "lost" ? "#ef4444" : "#f59e0b";
  ctx.fillStyle = sCol; ctx.font = "bold 11px sans-serif";
  ctx.fillText(slip.status.toUpperCase(), W - 70, 28);

  // Divider
  ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(20, 74); ctx.lineTo(W - 20, 74); ctx.stroke();

  // Selections
  let y = HDR;
  for (const sel of slip.selections) {
    const ok = sel.status === "won", fail = sel.status === "lost";
    const bgCol = ok ? "rgba(34,197,94,0.06)" : fail ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)";
    ctx.fillStyle = bgCol;
    ctx.fillRect(14, y + 2, W - 28, ROW - 4);

    // status dot
    ctx.fillStyle = ok ? "#22c55e" : fail ? "#ef4444" : "#6b7280";
    ctx.beginPath(); ctx.arc(28, y + ROW / 2, 4, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#9ca3af"; ctx.font = "10px sans-serif";
    ctx.fillText(`${sel.homeTeam} vs ${sel.awayTeam}`, 40, y + 20);

    const oLabel = sel.outcome === "home" ? `${sel.homeTeam} Win` : sel.outcome === "away" ? `${sel.awayTeam} Win` : "Draw";
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 12px sans-serif";
    ctx.fillText(oLabel, 40, y + 38);

    if (sel.matchResult && sel.status !== "pending") {
      const rLabel = sel.matchResult === "home" ? `${sel.homeTeam} Win` : sel.matchResult === "away" ? `${sel.awayTeam} Win` : "Draw";
      ctx.fillStyle = "#6b7280"; ctx.font = "10px sans-serif";
      ctx.fillText(`Result: ${rLabel}`, 40, y + 54);
    }

    ctx.fillStyle = "#ffffff"; ctx.font = "bold 13px monospace";
    const oddsText = `${sel.odds.toFixed(2)}x`;
    const tw = ctx.measureText(oddsText).width;
    ctx.fillText(oddsText, W - 20 - tw, y + 38);

    ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(14, y + ROW); ctx.lineTo(W - 14, y + ROW); ctx.stroke();
    y += ROW;
  }

  // Summary box
  const sy = y + 8;
  ctx.fillStyle = "#111827"; ctx.fillRect(14, sy, W - 28, SUM - 16);

  const col2 = W / 2;
  ctx.fillStyle = "#6b7280"; ctx.font = "10px sans-serif";
  ctx.fillText("Stake", 24, sy + 20);
  ctx.fillStyle = "#ef4444"; ctx.font = "bold 12px sans-serif";
  ctx.fillText(`-KSh ${slip.stake.toFixed(2)}`, 24, sy + 36);

  ctx.fillStyle = "#6b7280"; ctx.font = "10px sans-serif";
  ctx.fillText("Combined Odds", 24, sy + 56);
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 12px sans-serif";
  ctx.fillText(`${slip.combinedOdds.toFixed(4)}x`, 24, sy + 72);

  if (slip.status === "won") {
    ctx.fillStyle = "#6b7280"; ctx.font = "10px sans-serif"; ctx.fillText("Won", col2, sy + 20);
    ctx.fillStyle = "#22c55e"; ctx.font = "bold 16px sans-serif";
    ctx.fillText(`KSh ${(slip.actualWinnings ?? 0).toFixed(2)}`, col2, sy + 44);
  } else if (slip.status === "pending") {
    ctx.fillStyle = "#6b7280"; ctx.font = "10px sans-serif"; ctx.fillText("Potential Win", col2, sy + 20);
    ctx.fillStyle = "#22c55e"; ctx.font = "bold 16px sans-serif";
    ctx.fillText(`KSh ${slip.potentialWinnings.toFixed(2)}`, col2, sy + 44);
  } else {
    ctx.fillStyle = "#6b7280"; ctx.font = "10px sans-serif"; ctx.fillText("Result", col2, sy + 20);
    ctx.fillStyle = "#ef4444"; ctx.font = "bold 13px sans-serif"; ctx.fillText("Slip Lost", col2, sy + 40);
  }

  // Watermark
  ctx.fillStyle = "#374151"; ctx.font = "9px sans-serif";
  ctx.fillText("GoalBet · Bet Responsibly · goalbet.app", 20, H - 8);

  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `GoalBet-Slip-${slip.slipId}.png`;
  a.click();
}

type SlipStatus = "pending" | "won" | "lost" | "refunded";

function statusBadge(status: string) {
  switch (status) {
    case "won": return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">Won</Badge>;
    case "lost": return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">Lost</Badge>;
    case "refunded": return <Badge variant="secondary">Refunded</Badge>;
    default: return <Badge variant="outline" className="border-primary text-primary animate-pulse">Pending</Badge>;
  }
}

function selectionStatusIcon(status: string) {
  switch (status) {
    case "won": return <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />;
    case "lost": return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
    default: return <Clock className="w-4 h-4 text-primary shrink-0" />;
  }
}

export default function MyBetsPage() {
  const [statusFilter, setStatusFilter] = useState<SlipStatus | "all">("all");
  const [selectedSlip, setSelectedSlip] = useState<BetSlipResponse | null>(null);

  const { data, isLoading } = useGetUserSlips(
    {
      page: 1,
      limit: 10,
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    },
    { query: { refetchInterval: 10000 } }
  );

  const slips = data?.slips ?? [];

  return (
    <UserLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white">My Bets</h1>
        <p className="text-muted-foreground mt-1">All your accumulator slips in one place.</p>
      </div>

      <Tabs defaultValue="all" onValueChange={(v) => setStatusFilter(v as any)} className="mb-6">
        <TabsList className="bg-card border border-border p-1 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold px-4">All</TabsTrigger>
          <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-secondary font-semibold px-4">Pending</TabsTrigger>
          <TabsTrigger value="won" className="rounded-lg data-[state=active]:bg-green-600 data-[state=active]:text-white font-semibold px-4">Won</TabsTrigger>
          <TabsTrigger value="lost" className="rounded-lg data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground font-semibold px-4">Lost</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : slips.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-card/50 border border-dashed border-border rounded-2xl">
          <Receipt className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No slips found.</p>
          <p className="text-sm text-muted-foreground mt-1">Head to Match Center to place your first bet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {slips.map((slip) => (
            <SlipCard key={slip.slipId} slip={slip} onView={() => setSelectedSlip(slip)} />
          ))}
        </div>
      )}

      {selectedSlip && (
        <SlipDetailModal slip={selectedSlip} open={!!selectedSlip} onClose={() => setSelectedSlip(null)} />
      )}
    </UserLayout>
  );
}

function SlipCard({ slip, onView }: { slip: BetSlipResponse; onView: () => void }) {
  const settledCount = slip.selections.filter((s) => s.status !== "pending").length;
  const wonCount = slip.selections.filter((s) => s.status === "won").length;
  const lostCount = slip.selections.filter((s) => s.status === "lost").length;

  return (
    <Card
      className={`overflow-hidden border-border/50 bg-card/80 backdrop-blur hover:border-primary/30 cursor-pointer transition-all ${
        slip.status === "won" ? "border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.05)]" :
        slip.status === "lost" ? "border-red-500/20" :
        "border-primary/20"
      }`}
      onClick={onView}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/40 border border-border/50 flex items-center justify-center shrink-0">
              {slip.status === "won" ? <Trophy className="w-5 h-5 text-green-400" /> :
               slip.status === "lost" ? <XCircle className="w-5 h-5 text-red-400" /> :
               <Receipt className="w-5 h-5 text-primary" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white text-sm">#{slip.slipId}</span>
                {statusBadge(slip.status)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDate(slip.createdAt)}</p>
            </div>
          </div>

          <div className="text-right flex items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{slip.selections.length} sel · {slip.combinedOdds.toFixed(2)}x</p>
              <p className="text-xs text-muted-foreground">Stake: {formatCurrency(slip.stake)}</p>
              {slip.status === "pending" && <p className="text-sm font-bold text-primary">To win: {formatCurrency(slip.potentialWinnings)}</p>}
              {slip.status === "won" && <p className="text-sm font-bold text-green-400">Won: {formatCurrency(slip.actualWinnings ?? 0)}</p>}
              {slip.status === "lost" && <p className="text-sm font-bold text-red-400">Lost: {formatCurrency(slip.stake)}</p>}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {slip.status === "pending" && settledCount > 0 && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-green-400 font-medium">{wonCount}✓</span>
              {lostCount > 0 && <span className="text-red-400 font-medium">{lostCount}✗</span>}
              <span>{slip.selections.length - settledCount} pending</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(settledCount / slip.selections.length) * 100}%` }} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SlipDetailModal({ slip, open, onClose }: { slip: BetSlipResponse; open: boolean; onClose: () => void }) {
  const outcomeLabel = (o: string, home: string, away: string) =>
    o === "home" ? `${home} Win` : o === "away" ? `${away} Win` : "Draw";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md border-primary/30 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Receipt className="w-5 h-5 text-primary" /> Slip #{slip.slipId}
          </DialogTitle>
          <DialogDescription>{formatDate(slip.createdAt)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {statusBadge(slip.status)}
            <span className="text-xs text-muted-foreground">{slip.selections.length} selections · {slip.combinedOdds.toFixed(4)}x</span>
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {slip.selections.map((sel, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  sel.status === "won" ? "border-green-500/30 bg-green-500/5" :
                  sel.status === "lost" ? "border-red-500/30 bg-red-500/5" :
                  "border-border/50 bg-secondary/20"
                }`}
              >
                {selectionStatusIcon(sel.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{sel.homeTeam} vs {sel.awayTeam}</p>
                  <p className="text-sm font-bold text-white">{outcomeLabel(sel.outcome, sel.homeTeam, sel.awayTeam)}</p>
                  {sel.matchResult && sel.status !== "pending" && (
                    <p className="text-xs text-muted-foreground">
                      Result: {sel.matchResult === "home" ? sel.homeTeam + " Win" : sel.matchResult === "away" ? sel.awayTeam + " Win" : "Draw"}
                    </p>
                  )}
                </div>
                <span className="font-mono text-sm font-bold text-white shrink-0">{sel.odds.toFixed(2)}x</span>
              </div>
            ))}
          </div>

          <div className="bg-secondary/40 rounded-xl p-4 border border-border/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stake</span>
              <span className="font-bold text-destructive">-{formatCurrency(slip.stake)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Combined Odds</span>
              <span className="font-bold text-white">{slip.combinedOdds.toFixed(4)}x</span>
            </div>
            {slip.status === "pending" && (
              <div className="flex justify-between border-t border-border/50 pt-2">
                <span className="text-muted-foreground">Potential Win</span>
                <span className="text-xl font-display font-black text-primary">{formatCurrency(slip.potentialWinnings)}</span>
              </div>
            )}
            {slip.status === "won" && (
              <div className="flex justify-between border-t border-border/50 pt-2">
                <span className="text-muted-foreground">Actual Winnings</span>
                <span className="text-xl font-display font-black text-green-400">{formatCurrency(slip.actualWinnings ?? 0)}</span>
              </div>
            )}
            {slip.status === "lost" && (
              <div className="flex justify-between border-t border-border/50 pt-2">
                <span className="text-muted-foreground">Result</span>
                <span className="text-sm font-bold text-red-400">Slip Lost</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={onClose} variant="outline">Close</Button>
            <Button className="flex-1 bg-primary text-primary-foreground" onClick={() => downloadSlipAsPng(slip)}>
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
