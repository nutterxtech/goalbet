import { useState, useEffect } from "react";
import { UserLayout } from "@/components/layout/UserLayout";
import { 
  useGetMatches, 
  usePlaceBet,
  MatchResponse,
  GetMatchesStatus
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatRelativeTime, formatDate } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";

function Countdown({ targetDate, label = "" }: { targetDate: string; label?: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    function tick() {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft("Starting...");
      } else {
        const h = Math.floor(difference / (1000 * 60 * 60));
        const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((difference % (1000 * 60)) / 1000);
        if (h > 0) setTimeLeft(`${h}h ${m}m`);
        else setTimeLeft(`${m}m ${s}s`);
      }
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return <span className="font-mono">{label}{timeLeft}</span>;
}

export default function MatchesPage() {
  const [activeTab, setActiveTab] = useState<GetMatchesStatus>("upcoming");
  
  // Refetch live matches every 3 seconds
  const { data, isLoading } = useGetMatches(
    { status: activeTab }, 
    { query: { refetchInterval: activeTab === 'live' ? 3000 : 15000 } }
  );

  return (
    <UserLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Match Center</h1>
          <p className="text-muted-foreground mt-1">Bet on virtual football simulations.</p>
        </div>
      </div>

      <Tabs defaultValue="upcoming" onValueChange={(v) => setActiveTab(v as GetMatchesStatus)}>
        <TabsList className="bg-card border border-border p-1 rounded-xl mb-6">
          <TabsTrigger value="upcoming" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold px-6">
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="live" className="rounded-lg data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground font-semibold px-6">
            <span className="flex items-center gap-2">
              Live {activeTab === 'live' && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
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
          ) : data?.matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-card/50 border border-dashed border-border rounded-2xl">
              <Clock className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No {activeTab} matches found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {data?.matches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </div>
      </Tabs>
    </UserLayout>
  );
}

function MatchCard({ match }: { match: MatchResponse }) {
  const [betModalOpen, setBetModalOpen] = useState(false);
  
  const isLive = match.status === 'live';
  const isCompleted = match.status === 'completed';
  const canBet = match.status === 'upcoming' || match.status === 'betting_open';

  return (
    <>
      <Card className={`overflow-hidden border-border/50 bg-card/80 backdrop-blur transition-all duration-300 ${isLive ? 'border-destructive/50 shadow-[0_0_15px_rgba(251,19,83,0.1)]' : 'hover:border-primary/30'}`}>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border/50 flex justify-between items-center bg-secondary/20">
            {isLive ? (
              <Badge variant="destructive" className="animate-pulse shadow-[0_0_10px_rgba(251,19,83,0.5)]">
                LIVE {match.minute}'
              </Badge>
            ) : isCompleted ? (
              <Badge variant="secondary">FT</Badge>
            ) : match.status === 'upcoming' ? (
              <Badge variant="outline" className="border-primary/50 text-primary bg-primary/5">
                <Clock className="w-3 h-3 mr-1" />
                {match.scheduledAt
                  ? <Countdown targetDate={match.scheduledAt} label="Starts in " />
                  : 'Upcoming'}
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

            {/* Last event snippet for live matches */}
            {isLive && match.events && match.events.length > 0 && (
              <div className="mb-4 text-center">
                <p className="text-xs text-primary animate-pulse truncate px-4">
                  {match.events[match.events.length - 1].minute}' - {match.events[match.events.length - 1].description}
                </p>
              </div>
            )}

            {/* Odds / Bet Action */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              {['home', 'draw', 'away'].map((outcome) => {
                const oddValue = match.odds[outcome as keyof typeof match.odds];
                const isWinner = isCompleted && match.result === outcome;
                
                return (
                  <div key={outcome} className={`
                    p-2 rounded-lg text-center border transition-all
                    ${isWinner ? 'bg-primary/20 border-primary text-primary' : 'bg-background border-border/50'}
                  `}>
                    <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                      {outcome === 'home' ? '1' : outcome === 'draw' ? 'X' : '2'}
                    </span>
                    <span className={`font-bold ${isWinner ? 'text-primary' : 'text-white'}`}>
                      {oddValue.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            {canBet && (
              <Button 
                onClick={() => setBetModalOpen(true)} 
                className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              >
                Place Bet
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <BetModal 
        match={match} 
        open={betModalOpen} 
        onOpenChange={setBetModalOpen} 
      />
    </>
  );
}

function BetModal({ match, open, onOpenChange }: { match: MatchResponse, open: boolean, onOpenChange: (open: boolean) => void }) {
  const [outcome, setOutcome] = useState<'home' | 'draw' | 'away'>('home');
  const [amount, setAmount] = useState<string>("50");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const betMutation = usePlaceBet({
    mutation: {
      onSuccess: () => {
        toast({ title: "Bet placed successfully!", variant: "default" });
        queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/bets"] });
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast({ title: "Failed to place bet", description: err.message, variant: "destructive" });
      }
    }
  });

  const numAmount = parseFloat(amount) || 0;
  const potentialWinnings = numAmount * match.odds[outcome];

  const handleBet = () => {
    if (numAmount < 5) {
      toast({ title: "Minimum bet is KSh 5", variant: "destructive" });
      return;
    }
    betMutation.mutate({ data: { matchId: match.id, outcome, amount: numAmount } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Place Your Bet</DialogTitle>
          <DialogDescription>
            {match.homeTeam} vs {match.awayTeam}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'home', label: 'Home Win', odd: match.odds.home },
              { id: 'draw', label: 'Draw', odd: match.odds.draw },
              { id: 'away', label: 'Away Win', odd: match.odds.away }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setOutcome(opt.id as any)}
                className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                  outcome === opt.id 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-border bg-background hover:border-muted-foreground text-muted-foreground hover:text-white'
                }`}
              >
                <span className="text-xs font-medium mb-1">{opt.label}</span>
                <span className="text-lg font-bold">{opt.odd.toFixed(2)}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Bet Amount (KSh)</label>
            <Input 
              type="number" 
              min="5" 
              value={amount} 
              onChange={e => setAmount(e.target.value)}
              className="text-lg font-bold h-14 bg-background border-border"
            />
            <div className="flex gap-2">
              {[50, 100, 500, 1000].map(val => (
                <Badge 
                  key={val} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary flex-1 justify-center py-1.5"
                  onClick={() => setAmount(val.toString())}
                >
                  +{val}
                </Badge>
              ))}
            </div>
          </div>

          <div className="bg-secondary/50 rounded-xl p-4 flex justify-between items-center border border-border/50">
            <span className="text-sm text-muted-foreground">Potential Return:</span>
            <span className="text-xl font-display font-bold text-primary">
              {formatCurrency(potentialWinnings)}
            </span>
          </div>

          <Button 
            onClick={handleBet} 
            disabled={betMutation.isPending || numAmount < 5}
            className="w-full h-14 text-lg font-bold text-primary-foreground bg-primary hover:bg-primary/90"
          >
            {betMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-2" /> Confirm Bet</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
