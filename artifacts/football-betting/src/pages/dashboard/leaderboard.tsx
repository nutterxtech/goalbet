import { UserLayout } from "@/components/layout/UserLayout";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { Loader2, Trophy, Medal } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function LeaderboardPage() {
  const { data, isLoading } = useGetLeaderboard();
  const { user } = useAuth();

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400 mx-auto" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300 mx-auto" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600 mx-auto" />;
    return <span className="font-bold text-muted-foreground">{rank}</span>;
  };

  return (
    <UserLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white">Leaderboard</h1>
        <p className="text-muted-foreground mt-1">Top players ranked by total winnings.</p>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-center w-16">Rank</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Total Bets</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                    <TableHead className="text-right">Total Winnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.leaderboard.map((entry) => {
                    const isCurrentUser = user?.id === entry.userId;
                    return (
                      <TableRow 
                        key={entry.userId} 
                        className={`border-border/50 ${isCurrentUser ? 'bg-primary/5 hover:bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-secondary/20'}`}
                      >
                        <TableCell className="text-center">{getRankIcon(entry.rank)}</TableCell>
                        <TableCell className="font-medium">
                          {entry.username} {isCurrentUser && <span className="text-xs text-primary ml-2">(You)</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{entry.totalBets}</TableCell>
                        <TableCell className="text-right font-mono">{(entry.winRate * 100).toFixed(1)}%</TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatCurrency(entry.totalWinnings)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </UserLayout>
  );
}
