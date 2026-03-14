import { UserLayout } from "@/components/layout/UserLayout";
import { useGetUserBets } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { Loader2 } from "lucide-react";

export default function MyBetsPage() {
  const { data, isLoading } = useGetUserBets({ page: 1, limit: 50 }, { query: { refetchInterval: 10000 } });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'won': return <Badge className="bg-success text-success-foreground hover:bg-success/90">Won</Badge>;
      case 'lost': return <Badge variant="destructive">Lost</Badge>;
      case 'refunded': return <Badge variant="secondary">Refunded</Badge>;
      default: return <Badge variant="outline" className="border-primary text-primary">Pending</Badge>;
    }
  };

  return (
    <UserLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white">My Bets</h1>
        <p className="text-muted-foreground mt-1">Track your betting history and active slips.</p>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : data?.bets.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              You haven't placed any bets yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Selection</TableHead>
                    <TableHead className="text-right">Odds</TableHead>
                    <TableHead className="text-right">Stake</TableHead>
                    <TableHead className="text-right">To Win</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.bets.map((bet) => (
                    <TableRow key={bet.id} className="border-border/50 hover:bg-secondary/20">
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {formatDate(bet.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {bet.homeTeam} vs {bet.awayTeam}
                      </TableCell>
                      <TableCell>
                        <span className="uppercase font-bold text-xs bg-background px-2 py-1 rounded border border-border">
                          {bet.outcome}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {bet.odds.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(bet.amount)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(bet.potentialWinnings)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(bet.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </UserLayout>
  );
}
