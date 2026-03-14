import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { 
  useGetMatches, 
  useAdminCreateMatch, 
  useAdminStartMatch, 
  useAdminStopMatch,
  MatchResponse
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Play, Square, Settings2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TEAMS = [
  "Manchester City", "Arsenal", "Liverpool", "Chelsea", "Manchester United", 
  "Tottenham", "Newcastle", "Aston Villa", "Real Madrid", "Barcelona", 
  "Atletico Madrid", "Bayern Munich", "Borussia Dortmund", "PSG", "Inter Milan", 
  "AC Milan", "Juventus", "Ajax", "Porto", "Benfica"
];

export default function AdminMatches() {
  const { data, isLoading } = useGetMatches({}, { query: { refetchInterval: 5000 } });
  const [createOpen, setCreateOpen] = useState(false);
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : data?.matches.map((match) => (
                  <TableRow key={match.id} className="border-border/50">
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
                      <div className="flex justify-end gap-2">
                        {(match.status === 'upcoming' || match.status === 'betting_open') && (
                          <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-black" onClick={() => startMutation.mutate({ id: match.id })}>
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        {match.status === 'live' && (
                          <Button size="sm" variant="destructive" onClick={() => stopMutation.mutate({ id: match.id })}>
                            <Square className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="secondary"><Settings2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateMatchModal open={createOpen} onOpenChange={setCreateOpen} />
    </AdminLayout>
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
