import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { 
  useGetMatches, 
  useAdminCreateMatch, 
  useAdminStartMatch, 
  useAdminStopMatch,
  useAdminOverrideResult,
  MatchResponse
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Play, Square, Trophy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";

const TEAMS = [
  "Manchester City", "Arsenal", "Liverpool", "Chelsea", "Manchester United", 
  "Tottenham", "Newcastle", "Aston Villa", "Real Madrid", "Barcelona", 
  "Atletico Madrid", "Bayern Munich", "Borussia Dortmund", "PSG", "Inter Milan", 
  "AC Milan", "Juventus", "Ajax", "Porto", "Benfica"
];

interface BetDist {
  home: { total: number; count: number };
  draw: { total: number; count: number };
  away: { total: number; count: number };
}

export default function AdminMatches() {
  const { data, isLoading } = useGetMatches({}, { query: { refetchInterval: 5000 } });
  const [createOpen, setCreateOpen] = useState(false);
  const [forceWinnerMatch, setForceWinnerMatch] = useState<MatchResponse | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const startMutation = useAdminStartMatch({
    mutation: {
      onSuccess: () => {
        toast({ title: "Match Started" });
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      }
    }
  });

  const stopMutation = useAdminStopMatch({
    mutation: {
      onSuccess: () => {
        toast({ title: "Match Stopped" });
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      }
    }
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Manage Matches</h1>
        <Button onClick={() => setCreateOpen(true)} className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> New Match
        </Button>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="border-border/50">
                  <TableHead>Teams</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Odds (1X2)</TableHead>
                  <TableHead className="text-right">Home Bets</TableHead>
                  <TableHead className="text-right">Away Bets</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : data?.matches.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    onStart={() => startMutation.mutate({ id: match.id })}
                    onStop={() => stopMutation.mutate({ id: match.id })}
                    onForceWinner={() => setForceWinnerMatch(match)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateMatchModal open={createOpen} onOpenChange={setCreateOpen} />
      {forceWinnerMatch && (
        <ForceWinnerModal 
          match={forceWinnerMatch} 
          open={!!forceWinnerMatch} 
          onOpenChange={(open) => { if (!open) setForceWinnerMatch(null); }} 
        />
      )}
    </AdminLayout>
  );
}

function MatchRow({ match, onStart, onStop, onForceWinner }: {
  match: MatchResponse;
  onStart: () => void;
  onStop: () => void;
  onForceWinner: () => void;
}) {
  const [dist, setDist] = useState<BetDist | null>(null);
  const [loadingDist, setLoadingDist] = useState(false);

  const isActive = match.status === 'upcoming' || match.status === 'betting_open' || match.status === 'live';

  // Auto-fetch bet distribution for active matches
  useEffect(() => {
    if (!isActive) return;
    setLoadingDist(true);
    const token = localStorage.getItem("goalbet_token");
    fetch(`/api/admin/matches/${match.id}/bet-distribution`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setDist(d); })
      .finally(() => setLoadingDist(false));
  }, [match.id, isActive]);

  return (
    <TableRow className="border-border/50">
      <TableCell className="font-medium">
        {match.homeTeam} vs {match.awayTeam}
      </TableCell>
      <TableCell className="font-display font-bold text-lg">
        {match.homeScore} - {match.awayScore}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={
          match.status === 'live' ? 'border-destructive text-destructive animate-pulse' :
          match.status === 'completed' ? 'border-muted text-muted-foreground' : 'border-primary text-primary'
        }>
          {match.status.replace('_', ' ').toUpperCase()} {match.status === 'live' && `${match.minute}'`}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {match.odds.home.toFixed(2)} | {match.odds.draw.toFixed(2)} | {match.odds.away.toFixed(2)}
      </TableCell>
      <TableCell className="text-right">
        {loadingDist ? (
          <Loader2 className="w-3 h-3 animate-spin ml-auto" />
        ) : dist ? (
          <div className="text-right">
            <div className="font-mono text-xs font-bold text-white">{formatCurrency(dist.home.total)}</div>
            <div className="text-[10px] text-muted-foreground">{dist.home.count} bets</div>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {loadingDist ? (
          <Loader2 className="w-3 h-3 animate-spin ml-auto" />
        ) : dist ? (
          <div className="text-right">
            <div className="font-mono text-xs font-bold text-white">{formatCurrency(dist.away.total)}</div>
            <div className="text-[10px] text-muted-foreground">{dist.away.count} bets</div>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {(match.status === 'upcoming' || match.status === 'betting_open') && (
            <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-black" onClick={onStart}>
              <Play className="w-4 h-4" />
            </Button>
          )}
          {match.status === 'live' && (
            <Button size="sm" variant="destructive" onClick={onStop}>
              <Square className="w-4 h-4" />
            </Button>
          )}
          {isActive && (
            <Button size="sm" variant="secondary" onClick={onForceWinner} title="Force Winner">
              <Trophy className="w-4 h-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function ForceWinnerModal({ match, open, onOpenChange }: { match: MatchResponse; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [result, setResult] = useState<'home' | 'draw' | 'away'>('home');
  const [dist, setDist] = useState<BetDist | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const overrideMutation = useAdminOverrideResult({
    mutation: {
      onSuccess: () => {
        toast({ title: "Winner Set", description: `${match.homeTeam} vs ${match.awayTeam} — result forced.` });
        queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast({ title: "Failed", description: err.message, variant: "destructive" });
      }
    }
  });

  // Fetch distribution when modal opens
  useEffect(() => {
    if (!open) return;
    const token = localStorage.getItem("goalbet_token");
    fetch(`/api/admin/matches/${match.id}/bet-distribution`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.ok ? r.json() : null).then(d => { if (d) setDist(d); });
  }, [open, match.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" /> Force Match Winner
          </DialogTitle>
          <DialogDescription>{match.homeTeam} vs {match.awayTeam}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Bet distribution */}
          {dist && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: match.homeTeam, key: 'home', val: dist.home },
                { label: 'Draw', key: 'draw', val: dist.draw },
                { label: match.awayTeam, key: 'away', val: dist.away },
              ].map(({ label, key, val }) => (
                <div key={key} className="bg-secondary/40 rounded-lg p-2 border border-border/50">
                  <p className="text-[10px] text-muted-foreground truncate">{label}</p>
                  <p className="font-bold text-sm text-white">{formatCurrency(val.total)}</p>
                  <p className="text-[10px] text-muted-foreground">{val.count} bets</p>
                </div>
              ))}
            </div>
          )}

          {/* Pick winner */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Set Winner</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'home', label: match.homeTeam },
                { id: 'draw', label: 'Draw' },
                { id: 'away', label: match.awayTeam },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setResult(opt.id as any)}
                  className={`p-3 rounded-xl border-2 text-xs font-bold transition-all truncate ${
                    result === opt.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-xs text-destructive">
            This will immediately end the match and settle all bets according to the selected result.
          </div>

          <Button
            className="w-full bg-destructive hover:bg-destructive/90 text-white font-bold"
            onClick={() => overrideMutation.mutate({ id: match.id, data: { result } })}
            disabled={overrideMutation.isPending}
          >
            {overrideMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirm & Settle Bets
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateMatchModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [homeTeam, setHomeTeam] = useState(TEAMS[0]);
  const [awayTeam, setAwayTeam] = useState(TEAMS[1]);
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
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card">
        <DialogHeader>
          <DialogTitle>Create Simulation Match</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm">Home Team</label>
              <Select value={homeTeam} onValueChange={setHomeTeam}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEAMS.map(t => <SelectItem key={t} value={t} disabled={t === awayTeam}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm">Away Team</label>
              <Select value={awayTeam} onValueChange={setAwayTeam}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEAMS.map(t => <SelectItem key={t} value={t} disabled={t === homeTeam}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm">1 (Home)</label>
              <Input type="number" step="0.01" value={homeOdd} onChange={e => setHomeOdd(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm">X (Draw)</label>
              <Input type="number" step="0.01" value={drawOdd} onChange={e => setDrawOdd(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm">2 (Away)</label>
              <Input type="number" step="0.01" value={awayOdd} onChange={e => setAwayOdd(e.target.value)} />
            </div>
          </div>

          <Button 
            className="w-full mt-4" 
            onClick={() => mutation.mutate({ data: { homeTeam, awayTeam, odds: { home: parseFloat(homeOdd), draw: parseFloat(drawOdd), away: parseFloat(awayOdd) } } })}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Match
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
