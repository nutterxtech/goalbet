import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminGetBets } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  won: "bg-green-500/20 text-green-400 border-green-500/30",
  lost: "bg-red-500/20 text-red-400 border-red-500/30",
  refunded: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export default function AdminBets() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminGetBets({ page, limit: 20 }, { query: { refetchInterval: 5000 } });

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">All Bets</h1>
        <p className="text-muted-foreground mt-1">View all bets placed on the platform</p>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-white">Bets ({data?.total ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border/50">
                  <th className="text-left py-3 px-2">User</th>
                  <th className="text-left py-3 px-2">Match</th>
                  <th className="text-left py-3 px-2">Outcome</th>
                  <th className="text-right py-3 px-2">Amount</th>
                  <th className="text-right py-3 px-2">Odds</th>
                  <th className="text-right py-3 px-2">Potential Win</th>
                  <th className="text-right py-3 px-2">Actual Win</th>
                  <th className="text-center py-3 px-2">Status</th>
                  <th className="text-right py-3 px-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : data?.bets.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No bets found</td></tr>
                ) : (
                  data?.bets.map((bet) => (
                    <tr key={bet.id} className="border-b border-border/30 hover:bg-white/5">
                      <td className="py-3 px-2 text-white font-medium">{bet.username}</td>
                      <td className="py-3 px-2 text-muted-foreground">{bet.homeTeam} vs {bet.awayTeam}</td>
                      <td className="py-3 px-2">
                        <span className="capitalize text-primary font-medium">{bet.outcome}</span>
                      </td>
                      <td className="py-3 px-2 text-right text-white">{formatCurrency(bet.amount)}</td>
                      <td className="py-3 px-2 text-right text-muted-foreground">{bet.odds.toFixed(2)}x</td>
                      <td className="py-3 px-2 text-right text-green-400">{formatCurrency(bet.potentialWinnings)}</td>
                      <td className="py-3 px-2 text-right text-yellow-400">{bet.actualWinnings ? formatCurrency(bet.actualWinnings) : "-"}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge className={`text-xs ${statusColors[bet.status] || ""}`}>{bet.status}</Badge>
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground text-xs">
                        {new Date(bet.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-4">
            <span className="text-muted-foreground text-sm">Page {page} of {data?.totalPages ?? 1}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 bg-card border border-border/50 rounded text-sm text-white disabled:opacity-40">Previous</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= (data?.totalPages ?? 1)}
                className="px-3 py-1 bg-card border border-border/50 rounded text-sm text-white disabled:opacity-40">Next</button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
