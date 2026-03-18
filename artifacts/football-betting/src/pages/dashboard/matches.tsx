import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { UserLayout } from "@/components/layout/UserLayout";
import {
  useGetMatches,
  useGetUserSlips,
  usePlaceBetSlip,
  MatchResponse,
  GetMatchesStatus,
  BetSlipResponse,
  SlipSelection,
} from "@workspace/api-client-react";
import { useGetBalance } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Loader2, Clock, CheckCircle2, XCircle, Trash2, ChevronRight,
  Receipt, Wallet, Sparkles, ArrowDownToLine, ArrowUpFromLine, Activity,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatRelativeTime, formatDate } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

interface SlipEntry {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  outcome: "home" | "draw" | "away";
  odds: number;
}

function Countdown({ targetDate, label = "" }: { targetDate: string; label?: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  useEffect(() => {
    function tick() {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Starting..."); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [targetDate]);
  return <span className="font-mono">{label}{timeLeft}</span>;
}

// ─── Feature Quick-Access Panel ────────────────────────────────────────────────
function FeaturePanel({ balance }: { balance: number }) {

  return (
    <div className="mb-8 space-y-4">
      {/* ── Top row: Balance + Deposit/Withdraw ── */}
      <div className="bg-gradient-to-r from-[#0e1f14] via-[#0a1a10] to-[#0d0d14] border border-primary/25 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_40px_rgba(0,230,92,0.08)]">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Wallet className="h-7 w-7 text-primary" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-ping opacity-60" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-bold mb-0.5">Available Balance</p>
            <p className="text-3xl sm:text-4xl font-display font-black text-primary tracking-tight leading-none">
              {formatCurrency(balance)}
            </p>
          </div>
        </div>
        <div className="flex gap-2.5 shrink-0">
          <Link href="/dashboard/transactions">
            <Button className="bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-[0_0_16px_rgba(0,230,92,0.25)] h-10 px-5">
              <ArrowDownToLine className="w-4 h-4 mr-1.5" /> Deposit
            </Button>
          </Link>
          <Link href="/dashboard/transactions">
            <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 font-bold h-10 px-5">
              <ArrowUpFromLine className="w-4 h-4 mr-1.5" /> Withdraw
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Lucky Wheel hero banner ── */}
      <Link href="/dashboard/lucky-wheel">
        <div className="relative overflow-hidden rounded-2xl border-2 border-yellow-400/50 cursor-pointer group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_50px_rgba(250,204,21,0.35)] shadow-[0_0_30px_rgba(250,204,21,0.15)]"
          style={{ background: "linear-gradient(135deg, #1a1200 0%, #2d1f00 30%, #1a0d00 60%, #0d0d14 100%)" }}>
          {/* Animated glow orbs */}
          <div className="absolute -top-8 -left-8 w-40 h-40 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-orange-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-24 bg-yellow-400/5 rounded-full blur-2xl" />

          <div className="relative z-10 flex items-center justify-between p-5 sm:p-6">
            {/* Left: text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 px-2 py-0.5 rounded-full">🔥 HOT</span>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-primary/20 border border-primary/40 text-primary px-2 py-0.5 rounded-full">FREE SPINS</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-black text-white leading-tight">
                Lucky <span className="text-yellow-400">Wheel</span>
              </h3>
              <p className="text-sm text-yellow-200/70 mt-0.5 font-medium">Spin &amp; win up to <span className="text-yellow-400 font-black">10×</span> your stake!</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {["2×", "3×", "5×", "10×"].map((m) => (
                  <span key={m} className="text-[10px] font-black bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 px-2 py-0.5 rounded-md">{m}</span>
                ))}
              </div>
            </div>

            {/* Right: spinning wheel icon + CTA */}
            <div className="flex flex-col items-center gap-3 ml-4 shrink-0">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                {/* Outer glow ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400/30 to-orange-500/20" style={{ animation: "spin 8s linear infinite" }} />
                <div className="absolute inset-1 rounded-full border-2 border-yellow-400/40 border-dashed" style={{ animation: "spin 12s linear infinite reverse" }} />
                {/* Center wheel */}
                <div className="absolute inset-3 rounded-full bg-gradient-to-br from-yellow-500 via-orange-500 to-yellow-600 flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.5)] group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="w-7 h-7 sm:w-9 sm:h-9 text-white drop-shadow-lg animate-pulse" />
                </div>
              </div>
              <span className="text-xs font-black bg-yellow-400 text-black px-4 py-1.5 rounded-full group-hover:bg-yellow-300 transition-colors shadow-[0_0_12px_rgba(250,204,21,0.4)]">
                SPIN NOW →
              </span>
            </div>
          </div>
        </div>
      </Link>

    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function MatchesPage() {
  const [activeTab, setActiveTab] = useState<GetMatchesStatus>("upcoming");
  const [slip, setSlip] = useState<SlipEntry[]>([]);
  const [slipOpen, setSlipOpen] = useState(false);
  const [confirmedSlip, setConfirmedSlip] = useState<BetSlipResponse | null>(null);
  const { isAuthenticated, user } = useAuth();

  const { data: balanceData } = useGetBalance({
    query: { enabled: !!user, refetchInterval: 5000 },
  });

  const { data, isLoading } = useGetMatches(
    { status: activeTab, limit: activeTab === "completed" ? 8 : 50 },
    { query: { refetchInterval: activeTab === "live" ? 3000 : 15000 } }
  );

  const { data: userSlipsData } = useGetUserSlips(
    { page: 1, limit: 100, status: "pending" },
    { query: { enabled: isAuthenticated, refetchInterval: 15000 } }
  );

  const bettedMatchIds = new Set<string>();
  if (userSlipsData?.slips) {
    for (const s of userSlipsData.slips) {
      for (const sel of s.selections) bettedMatchIds.add(sel.matchId);
    }
  }

  const addToSlip = useCallback((entry: SlipEntry) => {
    setSlip((prev) => {
      const idx = prev.findIndex((s) => s.matchId === entry.matchId);
      if (idx >= 0) {
        if (prev[idx].outcome === entry.outcome) return prev.filter((_, i) => i !== idx);
        return prev.map((s, i) => (i === idx ? entry : s));
      }
      return [...prev, entry];
    });
  }, []);

  const removeFromSlip = useCallback((matchId: string) => {
    setSlip((prev) => prev.filter((s) => s.matchId !== matchId));
  }, []);

  const allMatches = data?.matches ?? [];
  const displayMatches = activeTab === "completed" ? allMatches.slice(0, 8) : allMatches;
  const isEmpty = !isLoading && displayMatches.length === 0;
  const combinedOdds = slip.reduce((acc, s) => acc * s.odds, 1);
  const balance = balanceData?.balance ?? user?.balance ?? 0;

  return (
    <UserLayout>
      {/* Feature overview panel */}
      <FeaturePanel balance={balance} />

      {/* Match Centre header */}
      <div className="flex flex-col items-center text-center mb-6 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
            <Activity className="h-6 w-6 text-sky-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white leading-none">Match Centre</h2>
        </div>
        <p className="text-sm text-muted-foreground">Click an outcome to add it to your bet slip</p>
        {slip.length > 0 && (
          <Button
            onClick={() => setSlipOpen(true)}
            className="mt-1 bg-primary text-primary-foreground font-bold shadow-[0_0_20px_rgba(0,230,92,0.35)] animate-pulse h-10 px-5"
          >
            <Receipt className="w-4 h-4 mr-2" />
            Slip ({slip.length}) · {combinedOdds.toFixed(2)}×
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" onValueChange={(v) => setActiveTab(v as GetMatchesStatus)}>
        <TabsList className="bg-card border border-border/60 p-1 rounded-xl mb-6 w-full sm:w-auto">
          <TabsTrigger value="upcoming" className="rounded-lg data-[state=active]:bg-sky-600 data-[state=active]:text-white font-semibold px-5 flex-1 sm:flex-none">
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="live" className="rounded-lg data-[state=active]:bg-destructive data-[state=active]:text-white font-semibold px-5 flex-1 sm:flex-none">
            <span className="flex items-center gap-2">
              ● Live
              {activeTab === "live" && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
            </span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-white font-semibold px-5 flex-1 sm:flex-none">
            Results
          </TabsTrigger>
        </TabsList>

        <div className="min-h-[300px]">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center h-48 bg-card/50 border border-dashed border-border rounded-2xl">
              <Clock className="w-10 h-10 text-muted-foreground/50 mb-3" />
              <p className="text-base font-medium text-muted-foreground">
                {activeTab === "completed" ? "No completed matches yet." : `No ${activeTab} matches found.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  slipEntry={slip.find((s) => s.matchId === match.id)}
                  alreadyBet={bettedMatchIds.has(match.id)}
                  onAddToSlip={addToSlip}
                  userSlip={userSlipsData?.slips?.find((s) =>
                    s.selections.some((sel) => sel.matchId === match.id)
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </Tabs>

      {/* Floating slip chip */}
      {slip.length > 0 && !slipOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 bg-card border-2 border-primary/50 rounded-2xl p-4 shadow-[0_0_30px_rgba(0,230,92,0.2)] cursor-pointer max-w-xs w-full"
          onClick={() => setSlipOpen(true)}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-white flex items-center gap-2 text-sm">
              <Receipt className="w-4 h-4 text-primary" /> Bet Slip
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">{slip.length}</Badge>
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-xs text-muted-foreground">
            Combined: <span className="text-primary font-bold">{combinedOdds.toFixed(2)}×</span>
          </div>
        </div>
      )}

      <SlipPanel
        slip={slip}
        open={slipOpen}
        onClose={() => setSlipOpen(false)}
        onRemove={removeFromSlip}
        onClear={() => setSlip([])}
        onSuccess={(s) => { setSlip([]); setSlipOpen(false); setConfirmedSlip(s); }}
      />

      {confirmedSlip && (
        <SlipReceiptModal slip={confirmedSlip} open={!!confirmedSlip} onClose={() => setConfirmedSlip(null)} />
      )}
    </UserLayout>
  );
}

// ─── Match Card ────────────────────────────────────────────────────────────────
function MatchCard({
  match, slipEntry, alreadyBet, onAddToSlip, userSlip,
}: {
  match: MatchResponse;
  slipEntry?: SlipEntry;
  alreadyBet?: boolean;
  onAddToSlip: (entry: SlipEntry) => void;
  userSlip?: BetSlipResponse;
}) {
  const isLive = match.status === "live";
  const isCompleted = match.status === "completed";
  const canBet = (match.status === "upcoming" || match.status === "betting_open") && !alreadyBet;
  const userSelection = userSlip?.selections.find((s) => s.matchId === match.id);

  return (
    <Card className={`overflow-hidden border bg-card/90 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 ${
      isLive ? "border-destructive/60 shadow-[0_0_18px_rgba(251,19,83,0.15)]" :
      slipEntry ? "border-primary/60 shadow-[0_0_18px_rgba(0,230,92,0.15)]" :
      "border-border/50 hover:border-sky-500/30 hover:shadow-[0_0_12px_rgba(14,165,233,0.1)]"
    }`}>
      <CardContent className="p-0">
        {/* Card header */}
        <div className={`px-4 py-2.5 border-b flex justify-between items-center ${
          isLive ? "bg-destructive/10 border-destructive/30" :
          slipEntry ? "bg-primary/5 border-primary/20" :
          "bg-secondary/20 border-border/40"
        }`}>
          {isLive ? (
            <Badge variant="destructive" className="animate-pulse text-xs shadow-[0_0_8px_rgba(251,19,83,0.5)] gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping inline-block" />
              LIVE {match.minute}&apos;
            </Badge>
          ) : isCompleted ? (
            <Badge variant="secondary" className="text-xs">FT</Badge>
          ) : match.status === "upcoming" ? (
            <Badge variant="outline" className="border-sky-500/50 text-sky-400 bg-sky-500/5 text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {match.scheduledAt ? <Countdown targetDate={match.scheduledAt} label="" /> : "Soon"}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/5 text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Betting: <Countdown targetDate={match.bettingClosesAt!} />
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground">
            {isCompleted ? formatDate(match.completedAt) : formatRelativeTime(match.scheduledAt)}
          </span>
        </div>

        {/* Teams & score */}
        <div className="px-4 py-5">
          <div className="flex justify-between items-center mb-5">
            <div className="text-center w-5/12">
              <div className="font-display font-bold text-base leading-tight">{match.homeTeam}</div>
            </div>
            <div className="text-center w-2/12">
              {(isLive || isCompleted) ? (
                <div className={`text-2xl font-display font-black ${isLive ? "text-destructive" : "text-white"}`}>
                  {match.homeScore}–{match.awayScore}
                </div>
              ) : (
                <div className="text-base font-display font-bold text-muted-foreground">VS</div>
              )}
            </div>
            <div className="text-center w-5/12">
              <div className="font-display font-bold text-base leading-tight">{match.awayTeam}</div>
            </div>
          </div>

          {isLive && match.events && match.events.length > 0 && (
            <div className="mb-4 px-2 py-1.5 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-[10px] text-destructive animate-pulse truncate text-center">
                ⚽ {match.events[match.events.length - 1].minute}&apos; — {match.events[match.events.length - 1].description}
              </p>
            </div>
          )}

          {/* Outcome buttons */}
          <div className="grid grid-cols-3 gap-2">
            {(["home", "draw", "away"] as const).map((outcome) => {
              const oddValue = match.odds[outcome];
              const isWinner = isCompleted && match.result === outcome;
              const isInSlip = slipEntry?.outcome === outcome;
              const isMyPick = userSelection?.outcome === outcome;
              const isClickable = canBet && !isCompleted && !isLive;

              return (
                <button
                  key={outcome}
                  onClick={() => isClickable && onAddToSlip({ matchId: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, outcome, odds: oddValue })}
                  disabled={!isClickable}
                  className={`py-2.5 px-1 rounded-xl text-center border transition-all ${
                    isInSlip
                      ? "bg-primary/25 border-primary text-primary scale-105 shadow-[0_0_10px_rgba(0,230,92,0.25)]"
                      : isWinner
                      ? "bg-green-500/20 border-green-500/60 text-green-400"
                      : isMyPick
                      ? "bg-sky-500/10 border-sky-500/40 text-sky-400"
                      : isClickable
                      ? "bg-card border-border/50 hover:border-sky-400/50 hover:bg-sky-500/5 hover:text-sky-300 cursor-pointer"
                      : "bg-card border-border/40 opacity-60"
                  }`}
                >
                  <span className="block text-[9px] uppercase tracking-wider text-current opacity-60 mb-0.5">
                    {outcome === "home" ? "1" : outcome === "draw" ? "X" : "2"}
                  </span>
                  <span className="font-bold text-sm">
                    {oddValue.toFixed(2)}
                  </span>
                  {isInSlip && <span className="block text-[8px] text-primary mt-0.5 font-bold">✓</span>}
                </button>
              );
            })}
          </div>

          {/* Result bar for completed matches */}
          {isCompleted && userSelection && (
            <div className={`mt-3 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold ${
              userSelection.status === "won"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}>
              {userSelection.status === "won"
                ? <><CheckCircle2 className="w-4 h-4 shrink-0" /> Selection won!</>
                : <><XCircle className="w-4 h-4 shrink-0" /> Selection lost</>
              }
            </div>
          )}

          {canBet && (
            <p className="text-center text-[10px] text-muted-foreground mt-2">
              {slipEntry ? "✓ Added — click to change" : "Click 1 / X / 2 to add to slip"}
            </p>
          )}
          {!canBet && alreadyBet && !isCompleted && (
            <p className="text-center text-[10px] text-sky-400 mt-2 font-medium">Bet placed ✓</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Slip Panel (Dialog) ───────────────────────────────────────────────────────
function SlipPanel({ slip, open, onClose, onRemove, onClear, onSuccess }: {
  slip: SlipEntry[];
  open: boolean;
  onClose: () => void;
  onRemove: (matchId: string) => void;
  onClear: () => void;
  onSuccess: (slip: BetSlipResponse) => void;
}) {
  const config = usePublicConfig();
  const minBet = config.minBet;
  const maxBet = config.maxBetAmount;
  const [stake, setStake] = useState(String(minBet));
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setStake((prev) => {
      const n = parseFloat(prev) || 0;
      return n < minBet ? String(minBet) : prev;
    });
  }, [minBet]);

  const combinedOdds = slip.reduce((acc, s) => acc * s.odds, 1);
  const numStake = parseFloat(stake) || 0;
  const potentialWin = numStake * combinedOdds;

  const placeMutation = usePlaceBetSlip({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/slips"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        onSuccess(data);
      },
      onError: (err: any) => {
        toast({ title: "Failed to place slip", description: err.message, variant: "destructive" });
      },
    },
  });

  const handlePlace = () => {
    if (numStake < minBet) { toast({ title: `Minimum stake is ${formatCurrency(minBet)}`, variant: "destructive" }); return; }
    if (numStake > maxBet) { toast({ title: `Maximum stake is ${formatCurrency(maxBet)}`, variant: "destructive" }); return; }
    placeMutation.mutate({ data: { selections: slip.map((s) => ({ matchId: s.matchId, outcome: s.outcome })), stake: numStake } });
  };

  const outcomeLabel = (o: string, home: string, away: string) =>
    o === "home" ? `${home} Win` : o === "away" ? `${away} Win` : "Draw";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md border-primary/40 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary text-xl font-display">
            <Receipt className="w-5 h-5" /> Bet Slip
          </DialogTitle>
          <DialogDescription>
            {slip.length} selection{slip.length !== 1 ? "s" : ""} · Combined odds: <strong>{combinedOdds.toFixed(2)}×</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
          {slip.map((s) => (
            <div key={s.matchId} className="flex items-center gap-3 bg-secondary/30 rounded-xl p-3 border border-border/50">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground truncate">{s.homeTeam} vs {s.awayTeam}</p>
                <p className="text-sm font-bold text-white truncate">{outcomeLabel(s.outcome, s.homeTeam, s.awayTeam)}</p>
                <p className="text-xs text-primary font-mono font-bold">{s.odds.toFixed(2)}×</p>
              </div>
              <button onClick={() => onRemove(s.matchId)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Stake (KSh) — Min {formatCurrency(minBet)}{maxBet < 999999 ? `, Max ${formatCurrency(maxBet)}` : ""}
            </label>
            <Input type="number" min={minBet} max={maxBet} value={stake} onChange={(e) => setStake(e.target.value)}
              className="text-lg font-bold h-12 bg-background border-border mt-1" />
            <div className="flex gap-2 mt-2">
              {[minBet, minBet * 2, minBet * 5, minBet * 10]
                .filter((v, i, a) => a.indexOf(v) === i && v <= maxBet)
                .map((val) => (
                  <button key={val} onClick={() => setStake(val.toString())}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      stake === String(val) ? "bg-primary/20 border-primary text-primary" : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/40"
                    }`}>
                    {val}
                  </button>
                ))}
            </div>
          </div>

          <div className="bg-secondary/40 rounded-xl p-4 border border-border/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Combined Odds</span>
              <span className="font-bold text-white">{combinedOdds.toFixed(4)}×</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stake</span>
              <span className="font-bold text-destructive">-{formatCurrency(numStake)}</span>
            </div>
            <div className="flex justify-between border-t border-border/50 pt-2">
              <span className="text-muted-foreground">Potential Win</span>
              <span className="text-xl font-display font-black text-primary">{formatCurrency(potentialWin)}</span>
            </div>
            {numStake >= minBet && (
              <div className="flex justify-between items-center bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 -mx-1">
                <span className="text-xs text-muted-foreground">If lost — 50% refunded</span>
                <span className="text-xs font-bold text-primary">+{formatCurrency(numStake * 0.5)} back</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClear} disabled={placeMutation.isPending}>Clear All</Button>
            <Button className="flex-1 h-12 font-bold bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handlePlace} disabled={placeMutation.isPending || numStake < minBet || numStake > maxBet}>
              {placeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Place Slip"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Receipt Modal ─────────────────────────────────────────────────────────────
function SlipReceiptModal({ slip, open, onClose }: { slip: BetSlipResponse; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm border-primary/30 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-display">
            <Receipt className="w-5 h-5" /> Slip Confirmed!
          </DialogTitle>
          <DialogDescription>Your accumulator slip has been placed.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center shadow-[0_0_24px_rgba(0,230,92,0.15)]">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Slip ID</p>
            <p className="font-mono font-black text-2xl text-primary">#{slip.slipId}</p>
          </div>

          <div className="space-y-2 max-h-[28vh] overflow-y-auto">
            {slip.selections.map((sel, i) => (
              <div key={i} className="flex justify-between text-sm py-1.5 border-b border-border/30">
                <span className="text-muted-foreground truncate flex-1">{sel.homeTeam} vs {sel.awayTeam}</span>
                <span className="font-bold text-white ml-2 shrink-0">
                  {sel.outcome === "home" ? "1" : sel.outcome === "draw" ? "X" : "2"} · {sel.odds.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 bg-secondary/40 rounded-xl p-4 border border-border/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Combined Odds</span>
              <span className="font-bold text-white">{slip.combinedOdds.toFixed(4)}×</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stake</span>
              <span className="font-bold text-destructive">-{formatCurrency(slip.stake)}</span>
            </div>
            <div className="flex justify-between border-t border-border/50 pt-2">
              <span className="text-muted-foreground">Potential Win</span>
              <span className="text-xl font-display font-black text-primary">{formatCurrency(slip.potentialWinnings)}</span>
            </div>
          </div>

          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold" onClick={onClose}>
            Done — Good Luck! 🏆
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
