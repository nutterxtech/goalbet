import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { API_BASE } from "@/lib/api";
import {
  useGetMatches,
  useAdminCreateMatch,
  useAdminStartMatch,
  useAdminStopMatch,
  useAdminOverrideResult,
  MatchResponse,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Play, Square, Trophy, Clock, Radio, CheckCircle2, RefreshCw, Pencil } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";

type TabStatus = "upcoming" | "live" | "completed";

const ALL_TEAMS = [
  "Arsenal", "Chelsea", "Liverpool", "Manchester City", "Manchester United",
  "Tottenham", "Newcastle United", "Aston Villa",
  "Real Madrid", "Barcelona", "Atlético Madrid", "Sevilla", "Real Betis", "Villarreal",
  "Bayern Munich", "Borussia Dortmund",
  "PSG", "Marseille", "Lyon",
  "Inter Milan", "AC Milan", "Juventus", "Napoli",
  "Porto", "Benfica",
  "Ajax", "Celtic", "Rangers",
  "Al Hilal", "Al Nassr", "Al Ittihad", "Al Ahli",
];

interface BetDist {
  home: { total: number; count: number };
  draw: { total: number; count: number };
  away: { total: number; count: number };
}

export default function AdminMatches() {
  const [activeTab, setActiveTab] = useState<TabStatus>("live");
  const [createOpen, setCreateOpen] = useState(false);
  const [forceWinnerMatch, setForceWinnerMatch] = useState<MatchResponse | null>(null);
  const [restartMatch, setRestartMatch] = useState<MatchResponse | null>(null);
  const [editOddsMatch, setEditOddsMatch] = useState<MatchResponse | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useGetMatches(
    { status: activeTab, limit: activeTab === "completed" ? 30 : 50 },
    { query: { refetchInterval: activeTab === "live" ? 4000 : 10000 } }
  );

  const startMutation = useAdminStartMatch({
    mutation: {
      onSuccess: () => { toast({ title: "Match Started" }); queryClient.invalidateQueries({ queryKey: ["/api/matches"] }); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    },
  });

  const stopMutation = useAdminStopMatch({
    mutation: {
      onSuccess: () => { toast({ title: "Match Stopped" }); queryClient.invalidateQueries({ queryKey: ["/api/matches"] }); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    },
  });

  const matches = data?.matches ?? [];

  const tabs: { id: TabStatus; label: string; icon: React.ReactNode }[] = [
    { id: "upcoming", label: "Upcoming", icon: <Clock className="w-4 h-4" /> },
    { id: "live",     label: "Live",     icon: <Radio className="w-4 h-4" /> },
    { id: "completed",label: "Completed",icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold text-white">Matches</h1>
        <Button onClick={() => setCreateOpen(true)} className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> New Match
        </Button>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              activeTab === t.id
                ? "bg-primary text-primary-foreground shadow"
                : "bg-secondary/60 text-muted-foreground hover:text-white hover:bg-secondary"
            }`}
          >
            {t.icon}
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === t.id ? "bg-white/20" : "bg-muted"}`}>
              {isLoading ? "…" : matches.length}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : matches.length === 0 ? (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="py-12 text-center text-muted-foreground">
            No {activeTab} matches right now.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              tab={activeTab}
              onStart={() => startMutation.mutate({ id: match.id })}
              onStop={() => stopMutation.mutate({ id: match.id })}
              onForceWinner={() => setForceWinnerMatch(match)}
              onRestart={() => setRestartMatch(match)}
              onEditOdds={() => setEditOddsMatch(match)}
            />
          ))}
        </div>
      )}

      <CreateMatchModal open={createOpen} onOpenChange={setCreateOpen} />
      {forceWinnerMatch && (
        <ForceWinnerModal match={forceWinnerMatch} open={!!forceWinnerMatch}
          onOpenChange={(o) => { if (!o) setForceWinnerMatch(null); }} />
      )}
      {restartMatch && (
        <RestartMatchModal match={restartMatch} open={!!restartMatch}
          onOpenChange={(o) => { if (!o) setRestartMatch(null); }} />
      )}
      {editOddsMatch && (
        <EditOddsModal match={editOddsMatch} open={!!editOddsMatch}
          onOpenChange={(o) => { if (!o) setEditOddsMatch(null); }} />
      )}
    </AdminLayout>
  );
}

function MatchCard({
  match, tab, onStart, onStop, onForceWinner, onRestart, onEditOdds,
}: {
  match: MatchResponse;
  tab: TabStatus;
  onStart: () => void;
  onStop: () => void;
  onForceWinner: () => void;
  onRestart: () => void;
  onEditOdds: () => void;
}) {
  const [dist, setDist] = useState<BetDist | null>(null);

  useEffect(() => {
    if (tab === "completed") return;
    const token = localStorage.getItem("goalbet_token");
    fetch(`${API_BASE}/admin/matches/${match.id}/bet-distribution`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setDist(d); });
  }, [match.id, tab]);

  const statusColor =
    match.status === "live" ? "border-red-500 text-red-400 animate-pulse" :
    match.status === "completed" ? "border-muted text-muted-foreground" :
    "border-primary text-primary";

  const minuteLabel = match.status === "live" ? ` ${match.minute}'` :
    match.status === "completed" ? " FT" : "";

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardContent className="p-4">
        {/* Row 1: teams / score / actions — always fully visible */}
        <div className="flex items-center gap-3">
          {/* Teams + score */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white">{match.homeTeam}</span>
              <span className="font-display font-bold text-xl text-white tabular-nums shrink-0 px-1">
                {match.homeScore} – {match.awayScore}
              </span>
              <span className="font-bold text-white">{match.awayTeam}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${statusColor}`}>
                {match.status.replace("_", " ").toUpperCase()}{minuteLabel}
              </Badge>
              <span className="text-[11px] text-muted-foreground font-mono">
                {match.odds.home.toFixed(2)} / {match.odds.draw.toFixed(2)} / {match.odds.away.toFixed(2)}
              </span>
              {tab === "completed" && match.result && (
                <Badge className="text-[10px] bg-secondary text-white capitalize">
                  {match.result === "home" ? match.homeTeam :
                   match.result === "away" ? match.awayTeam : "Draw"} wins
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            {tab === "upcoming" && (
              <>
                <Button size="sm" className="bg-primary text-black font-bold hover:bg-primary/90" onClick={onStart}>
                  <Play className="w-3.5 h-3.5 mr-1" /> Start
                </Button>
                <Button size="sm" variant="secondary" onClick={onEditOdds} title="Edit odds">
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Odds
                </Button>
                <Button size="sm" variant="secondary" onClick={onForceWinner} title="Pre-set result">
                  <Trophy className="w-3.5 h-3.5 mr-1" /> Pre-set
                </Button>
              </>
            )}
            {tab === "live" && (
              <>
                <Button size="sm" variant="destructive" onClick={onStop} title="Stop match">
                  <Square className="w-3.5 h-3.5 mr-1" /> Stop
                </Button>
                <Button size="sm" variant="secondary" onClick={onEditOdds} title="Edit odds">
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Odds
                </Button>
                <Button size="sm" variant="secondary" onClick={onForceWinner} title="Lock result">
                  <Trophy className="w-3.5 h-3.5 mr-1" /> Lock
                </Button>
              </>
            )}
            {tab === "completed" && (
              <Button size="sm" variant="outline" onClick={onRestart} title="Restart this match">
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Restart
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: bet distribution — shown below teams so nothing is squished */}
        {dist && tab !== "completed" && (
          <div className="flex gap-3 mt-3 pt-3 border-t border-border/30">
            {[
              { label: `${match.homeTeam} (Home)`, val: dist.home, color: "text-primary" },
              { label: "Draw", val: dist.draw, color: "text-yellow-400" },
              { label: `${match.awayTeam} (Away)`, val: dist.away, color: "text-blue-400" },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex-1 bg-secondary/40 rounded-lg px-3 py-2 border border-border/40 text-center">
                <p className={`font-bold text-sm ${color}`}>{formatCurrency(val.total)}</p>
                <p className="text-muted-foreground text-[10px] mt-0.5 truncate">{label} · {val.count} bets</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ForceWinnerModal({ match, open, onOpenChange }: {
  match: MatchResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [result, setResult] = useState<"home" | "draw" | "away">("home");
  const [dist, setDist] = useState<BetDist | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const overrideMutation = useAdminOverrideResult({
    mutation: {
      onSuccess: () => {
        toast({ title: "Result Locked", description: `${match.homeTeam} vs ${match.awayTeam} — result will be applied at FT.` });
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
        onOpenChange(false);
      },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
    },
  });

  useEffect(() => {
    if (!open) return;
    const token = localStorage.getItem("goalbet_token");
    fetch(`${API_BASE}/admin/matches/${match.id}/bet-distribution`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setDist(d); });
  }, [open, match.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" /> Lock Match Result
          </DialogTitle>
          <DialogDescription>
            {match.homeTeam} vs {match.awayTeam}
            {match.status === "live" && ` · ${match.minute}'`}
            {" "}— result applied at full time
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {dist && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: match.homeTeam, key: "home", val: dist.home },
                { label: "Draw",         key: "draw", val: dist.draw },
                { label: match.awayTeam, key: "away", val: dist.away },
              ].map(({ label, key, val }) => (
                <div key={key} className="bg-secondary/40 rounded-lg p-2 border border-border/50">
                  <p className="text-[10px] text-muted-foreground truncate">{label}</p>
                  <p className="font-bold text-sm text-white">{formatCurrency(val.total)}</p>
                  <p className="text-[10px] text-muted-foreground">{val.count} bets</p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Choose outcome</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "home", label: match.homeTeam },
                { id: "draw", label: "Draw" },
                { id: "away", label: match.awayTeam },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setResult(opt.id as any)}
                  className={`p-3 rounded-xl border-2 text-xs font-bold transition-all truncate ${
                    result === opt.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-xs text-primary">
            The live ticker continues normally. The locked result will be applied with a matching score at full time.
          </div>

          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            onClick={() => overrideMutation.mutate({ id: match.id, data: { result } })}
            disabled={overrideMutation.isPending}
          >
            {overrideMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Lock In Result
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateMatchModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [homeTeam, setHomeTeam] = useState(ALL_TEAMS[0]);
  const [awayTeam, setAwayTeam] = useState(ALL_TEAMS[1]);
  const [homeOdd, setHomeOdd] = useState("2.10");
  const [drawOdd, setDrawOdd] = useState("3.40");
  const [awayOdd, setAwayOdd] = useState("3.20");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useAdminCreateMatch({
    mutation: {
      onSuccess: () => {
        toast({ title: "Match Created" });
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
        onOpenChange(false);
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card">
        <DialogHeader>
          <DialogTitle>Create Match</DialogTitle>
          <DialogDescription>Manually schedule a new match. It will appear in Upcoming.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Home Team</label>
              <Select value={homeTeam} onValueChange={setHomeTeam}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_TEAMS.map((t) => <SelectItem key={t} value={t} disabled={t === awayTeam}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Away Team</label>
              <Select value={awayTeam} onValueChange={setAwayTeam}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_TEAMS.map((t) => <SelectItem key={t} value={t} disabled={t === homeTeam}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "1 – Home", val: homeOdd, set: setHomeOdd },
              { label: "X – Draw", val: drawOdd, set: setDrawOdd },
              { label: "2 – Away", val: awayOdd, set: setAwayOdd },
            ].map(({ label, val, set }) => (
              <div key={label} className="space-y-1">
                <label className="text-xs text-muted-foreground">{label}</label>
                <Input type="number" step="0.01" min="1.01" value={val} onChange={(e) => set(e.target.value)} />
              </div>
            ))}
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground font-bold mt-2"
            onClick={() =>
              mutation.mutate({
                data: {
                  homeTeam,
                  awayTeam,
                  odds: {
                    home: parseFloat(homeOdd),
                    draw: parseFloat(drawOdd),
                    away: parseFloat(awayOdd),
                  },
                },
              })
            }
            disabled={mutation.isPending || homeTeam === awayTeam}
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Create Match
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RestartMatchModal({ match, open, onOpenChange }: {
  match: MatchResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [homeOdd, setHomeOdd] = useState(String(match.odds.home));
  const [drawOdd, setDrawOdd] = useState(String(match.odds.draw));
  const [awayOdd, setAwayOdd] = useState(String(match.odds.away));
  const [minutes, setMinutes] = useState("5");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  async function handleRestart() {
    setLoading(true);
    try {
      const token = localStorage.getItem("goalbet_token");
      const resp = await fetch(`${API_BASE}/admin/matches/${match.id}/restart`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          startsInMinutes: parseInt(minutes) || undefined,
          odds: { home: parseFloat(homeOdd), draw: parseFloat(drawOdd), away: parseFloat(awayOdd) },
        }),
      });
      if (!resp.ok) { const e = await resp.json(); throw new Error(e.message); }
      toast({ title: "Match Restarted", description: `${match.homeTeam} vs ${match.awayTeam} is now Upcoming.` });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" /> Restart Match
          </DialogTitle>
          <DialogDescription>{match.homeTeam} vs {match.awayTeam} — will be reset to Upcoming</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Starts In (minutes)</label>
            <Input type="number" min="1" value={minutes} onChange={e => setMinutes(e.target.value)}
              className="bg-background border-border" placeholder="e.g. 5" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Odds (1 / X / 2)</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: match.homeTeam, val: homeOdd, set: setHomeOdd },
                { label: "Draw",         val: drawOdd, set: setDrawOdd },
                { label: match.awayTeam, val: awayOdd, set: setAwayOdd },
              ].map(({ label, val, set }) => (
                <div key={label} className="space-y-1">
                  <label className="text-[10px] text-muted-foreground truncate block">{label}</label>
                  <Input type="number" step="0.01" min="1.01" max="4.5" value={val}
                    onChange={e => set(e.target.value)} className="bg-background border-border" />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">Odds clamped 1.01 – 4.50</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300">
            Scores, events, and result will be cleared. Previous bets are not reversed.
          </div>
          <Button className="w-full font-bold" onClick={handleRestart} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Restart Match
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditOddsModal({ match, open, onOpenChange }: {
  match: MatchResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [homeOdd, setHomeOdd] = useState(String(match.odds.home));
  const [drawOdd, setDrawOdd] = useState(String(match.odds.draw));
  const [awayOdd, setAwayOdd] = useState(String(match.odds.away));
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  async function handleSave() {
    setLoading(true);
    try {
      const token = localStorage.getItem("goalbet_token");
      const resp = await fetch(`${API_BASE}/admin/matches/${match.id}/odds`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ odds: { home: parseFloat(homeOdd), draw: parseFloat(drawOdd), away: parseFloat(awayOdd) } }),
      });
      if (!resp.ok) { const e = await resp.json(); throw new Error(e.message); }
      toast({ title: "Odds Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" /> Edit Odds
          </DialogTitle>
          <DialogDescription>{match.homeTeam} vs {match.awayTeam}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: `1 – ${match.homeTeam}`, val: homeOdd, set: setHomeOdd },
              { label: "X – Draw",              val: drawOdd, set: setDrawOdd },
              { label: `2 – ${match.awayTeam}`, val: awayOdd, set: setAwayOdd },
            ].map(({ label, val, set }) => (
              <div key={label} className="space-y-1">
                <label className="text-[10px] text-muted-foreground truncate block">{label}</label>
                <Input type="number" step="0.01" min="1.01" max="4.5" value={val}
                  onChange={e => set(e.target.value)} className="bg-background border-border" />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">Range: 1.01 – 4.50. New bets use updated odds immediately.</p>
          <Button className="w-full font-bold bg-primary text-primary-foreground" onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Odds
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
