import { useState, useEffect, useCallback } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Clock, CheckCircle2, XCircle, Trash2, ChevronRight, Plus, Receipt, Download } from "lucide-react";
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

export default function MatchesPage() {
  const [activeTab, setActiveTab] = useState<GetMatchesStatus>("upcoming");
  const [slip, setSlip] = useState<SlipEntry[]>([]);
  const [slipOpen, setSlipOpen] = useState(false);
  const [confirmedSlip, setConfirmedSlip] = useState<BetSlipResponse | null>(null);
  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useGetMatches(
    { status: activeTab },
    { query: { refetchInterval: activeTab === "live" ? 3000 : 15000 } }
  );

  const { data: userSlipsData } = useGetUserSlips(
    { page: 1, limit: 100, status: "pending" },
    { query: { enabled: isAuthenticated, refetchInterval: 15000 } }
  );

  // Set of matchIds that user already has an active slip on
  const bettedMatchIds = new Set<string>();
  if (userSlipsData?.slips) {
    for (const s of userSlipsData.slips) {
      for (const sel of s.selections) {
        bettedMatchIds.add(sel.matchId);
      }
    }
  }

  const addToSlip = useCallback((entry: SlipEntry) => {
    setSlip((prev) => {
      const alreadyInSlip = prev.findIndex((s) => s.matchId === entry.matchId);
      if (alreadyInSlip >= 0) {
        // Toggle: if same outcome, remove; else update outcome
        if (prev[alreadyInSlip].outcome === entry.outcome) {
          return prev.filter((_, i) => i !== alreadyInSlip);
        }
        return prev.map((s, i) => (i === alreadyInSlip ? entry : s));
      }
      return [...prev, entry];
    });
  }, []);

  const removeFromSlip = useCallback((matchId: string) => {
    setSlip((prev) => prev.filter((s) => s.matchId !== matchId));
  }, []);

  const completedMatches = activeTab === "completed" && isAuthenticated
    ? (data?.matches ?? []).filter((m) => {
        const slip = userSlipsData?.slips?.find((s) =>
          s.selections.some((sel) => sel.matchId === m.id)
        );
        return !!slip;
      })
    : (data?.matches ?? []);

  const isEmpty = !isLoading && completedMatches.length === 0;
  const combinedOdds = slip.reduce((acc, s) => acc * s.odds, 1);

  return (
    <UserLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Match Center</h1>
          <p className="text-muted-foreground mt-1">Select outcomes to build your bet slip.</p>
        </div>
        {slip.length > 0 && (
          <Button
            onClick={() => setSlipOpen(true)}
            className="bg-primary text-primary-foreground font-bold shadow-[0_0_20px_rgba(0,230,92,0.3)] animate-pulse"
          >
            <Receipt className="w-4 h-4 mr-2" />
            Slip ({slip.length}) · {combinedOdds.toFixed(2)}x
          </Button>
        )}
      </div>

      <Tabs defaultValue="upcoming" onValueChange={(v) => setActiveTab(v as GetMatchesStatus)}>
        <TabsList className="bg-card border border-border p-1 rounded-xl mb-6">
          <TabsTrigger value="upcoming" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold px-6">
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="live" className="rounded-lg data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground font-semibold px-6">
            <span className="flex items-center gap-2">
              Live {activeTab === "live" && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
            </span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-white font-semibold px-6">
            Results
          </TabsTrigger>
        </TabsList>

        <div className="min-h-[400px]">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center h-64 bg-card/50 border border-dashed border-border rounded-2xl">
              <Clock className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                {activeTab === "completed" && isAuthenticated
                  ? "No results for your slips yet."
                  : `No ${activeTab} matches found.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {completedMatches.map((match) => (
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

      {/* Floating slip panel */}
      {slip.length > 0 && !slipOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 bg-card border border-primary/40 rounded-2xl p-4 shadow-[0_0_30px_rgba(0,230,92,0.15)] cursor-pointer max-w-xs w-full"
          onClick={() => setSlipOpen(true)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" /> Bet Slip
              <Badge className="bg-primary/20 text-primary border-primary/30">{slip.length}</Badge>
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-xs text-muted-foreground">
            Combined Odds: <span className="text-white font-bold">{combinedOdds.toFixed(2)}x</span>
          </div>
        </div>
      )}

      <SlipPanel
        slip={slip}
        open={slipOpen}
        onClose={() => setSlipOpen(false)}
        onRemove={removeFromSlip}
        onClear={() => setSlip([])}
        onSuccess={(s) => {
          setSlip([]);
          setSlipOpen(false);
          setConfirmedSlip(s);
        }}
      />

      {confirmedSlip && (
        <SlipReceiptModal
          slip={confirmedSlip}
          open={!!confirmedSlip}
          onClose={() => setConfirmedSlip(null)}
        />
      )}
    </UserLayout>
  );
}

function MatchCard({
  match,
  slipEntry,
  alreadyBet,
  onAddToSlip,
  userSlip,
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
    <Card className={`overflow-hidden border-border/50 bg-card/80 backdrop-blur transition-all duration-300 ${
      isLive ? "border-destructive/50 shadow-[0_0_15px_rgba(251,19,83,0.1)]" :
      slipEntry ? "border-primary/50 shadow-[0_0_15px_rgba(0,230,92,0.1)]" :
      "hover:border-primary/30"
    }`}>
      <CardContent className="p-0">
        <div className="p-4 border-b border-border/50 flex justify-between items-center bg-secondary/20">
          {isLive ? (
            <Badge variant="destructive" className="animate-pulse shadow-[0_0_10px_rgba(251,19,83,0.5)]">
              LIVE {match.minute}&apos;
            </Badge>
          ) : isCompleted ? (
            <Badge variant="secondary">FT</Badge>
          ) : match.status === "upcoming" ? (
            <Badge variant="outline" className="border-primary/50 text-primary bg-primary/5">
              <Clock className="w-3 h-3 mr-1" />
              {match.scheduledAt ? <Countdown targetDate={match.scheduledAt} label="Starts in " /> : "Upcoming"}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 bg-yellow-500/5">
              <Clock className="w-3 h-3 mr-1" />
              Betting: <Countdown targetDate={match.bettingClosesAt!} />
            </Badge>
          )}
          <span className="text-xs text-muted-foreground font-medium">
            {isCompleted ? formatDate(match.completedAt) : formatRelativeTime(match.scheduledAt)}
          </span>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="text-center w-1/3">
              <div className="font-display font-bold text-lg leading-tight break-words">{match.homeTeam}</div>
            </div>
            <div className="text-center w-1/3">
              {(isLive || isCompleted) ? (
                <div className="text-3xl font-display font-black text-white">
                  {match.homeScore} - {match.awayScore}
                </div>
              ) : (
                <div className="text-xl font-display font-bold text-muted-foreground">VS</div>
              )}
            </div>
            <div className="text-center w-1/3">
              <div className="font-display font-bold text-lg leading-tight break-words">{match.awayTeam}</div>
            </div>
          </div>

          {isLive && match.events && match.events.length > 0 && (
            <div className="mb-4 text-center">
              <p className="text-xs text-primary animate-pulse truncate px-4">
                {match.events[match.events.length - 1].minute}&apos; - {match.events[match.events.length - 1].description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mt-2">
            {(["home", "draw", "away"] as const).map((outcome) => {
              const oddValue = match.odds[outcome];
              const isWinner = isCompleted && match.result === outcome;
              const isInSlip = slipEntry?.outcome === outcome;
              const isMyPick = userSelection?.outcome === outcome;
              const isClickable = canBet && !isCompleted && !isLive;

              return (
                <button
                  key={outcome}
                  onClick={() => isClickable && onAddToSlip({
                    matchId: match.id,
                    homeTeam: match.homeTeam,
                    awayTeam: match.awayTeam,
                    outcome,
                    odds: oddValue,
                  })}
                  disabled={!isClickable}
                  className={`p-2 rounded-lg text-center border transition-all ${
                    isInSlip ? "bg-primary/20 border-primary text-primary scale-105" :
                    isWinner ? "bg-green-500/20 border-green-500 text-green-400" :
                    isMyPick ? "bg-secondary/60 border-muted-foreground/40" :
                    isClickable ? "bg-background border-border/50 hover:border-primary/50 hover:bg-primary/5 cursor-pointer" :
                    "bg-background border-border/50 opacity-70"
                  }`}
                >
                  <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                    {outcome === "home" ? "1" : outcome === "draw" ? "X" : "2"}
                  </span>
                  <span className={`font-bold ${isInSlip ? "text-primary" : isWinner ? "text-green-400" : "text-white"}`}>
                    {oddValue.toFixed(2)}
                  </span>
                  {isInSlip && <span className="block text-[9px] text-primary mt-0.5">✓ Added</span>}
                  {isMyPick && !isInSlip && <span className="block text-[9px] text-muted-foreground mt-0.5">Your pick</span>}
                </button>
              );
            })}
          </div>

          {isCompleted && userSelection && (
            <div className={`mt-4 flex items-center justify-center gap-2 p-3 rounded-xl border ${
              userSelection.status === "won"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}>
              {userSelection.status === "won" ? (
                <>
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <div className="text-sm font-semibold">Selection won!</div>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 shrink-0" />
                  <div className="text-sm font-semibold">Selection lost</div>
                </>
              )}
            </div>
          )}

          {canBet && !slipEntry && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              Click an outcome above to add to slip
            </p>
          )}
          {canBet && slipEntry && (
            <p className="text-center text-xs text-primary mt-3 font-medium">
              Added to slip · click again to change
            </p>
          )}
          {!canBet && alreadyBet && !isCompleted && (
            <p className="text-center text-xs text-muted-foreground mt-3">Bet placed on this match</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SlipPanel({
  slip,
  open,
  onClose,
  onRemove,
  onClear,
  onSuccess,
}: {
  slip: SlipEntry[];
  open: boolean;
  onClose: () => void;
  onRemove: (matchId: string) => void;
  onClear: () => void;
  onSuccess: (slip: BetSlipResponse) => void;
}) {
  const [stake, setStake] = useState("50");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    if (numStake < 5) {
      toast({ title: "Minimum stake is KSh 5", variant: "destructive" });
      return;
    }
    placeMutation.mutate({
      data: {
        selections: slip.map((s) => ({ matchId: s.matchId, outcome: s.outcome })),
        stake: numStake,
      },
    });
  };

  const outcomeLabel = (o: string, home: string, away: string) =>
    o === "home" ? `${home} Win` : o === "away" ? `${away} Win` : "Draw";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md border-primary/30 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary text-xl font-display">
            <Receipt className="w-5 h-5" /> Bet Slip
          </DialogTitle>
          <DialogDescription>
            {slip.length} selection{slip.length !== 1 ? "s" : ""} · Combined odds: <strong>{combinedOdds.toFixed(2)}x</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
          {slip.map((s) => (
            <div key={s.matchId} className="flex items-center gap-3 bg-secondary/30 rounded-xl p-3 border border-border/50">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{s.homeTeam} vs {s.awayTeam}</p>
                <p className="text-sm font-bold text-white truncate">{outcomeLabel(s.outcome, s.homeTeam, s.awayTeam)}</p>
                <p className="text-xs text-primary font-mono">{s.odds.toFixed(2)}x</p>
              </div>
              <button
                onClick={() => onRemove(s.matchId)}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Stake (KSh)</label>
            <Input
              type="number"
              min="5"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="text-lg font-bold h-12 bg-background border-border mt-1"
            />
            <div className="flex gap-2 mt-2">
              {[20, 50, 100, 500].map((val) => (
                <Badge
                  key={val}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary flex-1 justify-center py-1.5"
                  onClick={() => setStake(val.toString())}
                >
                  {val}
                </Badge>
              ))}
            </div>
          </div>

          <div className="bg-secondary/50 rounded-xl p-4 border border-border/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Combined Odds</span>
              <span className="font-bold text-white">{combinedOdds.toFixed(4)}x</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stake</span>
              <span className="font-bold text-destructive">-{formatCurrency(numStake)}</span>
            </div>
            <div className="flex justify-between border-t border-border/50 pt-2">
              <span className="text-muted-foreground">Potential Win</span>
              <span className="text-xl font-display font-black text-primary">{formatCurrency(potentialWin)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClear} disabled={placeMutation.isPending}>
              Clear All
            </Button>
            <Button
              className="flex-1 h-12 font-bold text-primary-foreground bg-primary hover:bg-primary/90"
              onClick={handlePlace}
              disabled={placeMutation.isPending || numStake < 5}
            >
              {placeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Place Slip</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SlipReceiptModal({
  slip,
  open,
  onClose,
}: {
  slip: BetSlipResponse;
  open: boolean;
  onClose: () => void;
}) {
  const handlePrint = () => {
    window.print();
  };

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
          <div className="bg-secondary/40 rounded-xl p-4 border border-border/50 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Slip ID</p>
            <p className="font-mono font-black text-2xl text-primary">#{slip.slipId}</p>
          </div>

          <div className="space-y-2 max-h-[30vh] overflow-y-auto">
            {slip.selections.map((sel, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b border-border/30">
                <span className="text-muted-foreground truncate flex-1">
                  {sel.homeTeam} vs {sel.awayTeam}
                </span>
                <span className="font-bold text-white ml-2 shrink-0">
                  {sel.outcome === "home" ? "1" : sel.outcome === "draw" ? "X" : "2"} · {sel.odds.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Combined Odds</span>
              <span className="font-bold text-white">{slip.combinedOdds.toFixed(4)}x</span>
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

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-center text-muted-foreground">
            All selections must win for the slip to pay out. Track your slip in <strong>My Bets</strong>.
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handlePrint}>
              <Download className="w-4 h-4 mr-2" /> Save
            </Button>
            <Button className="flex-1" onClick={onClose}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
