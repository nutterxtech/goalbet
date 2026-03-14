import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminGetDeposits } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";

export default function AdminDeposits() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminGetDeposits({ page, limit: 20 }, { query: { refetchInterval: 10000 } });

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Deposits</h1>
        <p className="text-muted-foreground mt-1">All user deposits on the platform</p>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-white">Deposits ({data?.total ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border/50">
                  <th className="text-left py-3 px-2">User</th>
                  <th className="text-left py-3 px-2">Description</th>
                  <th className="text-right py-3 px-2">Amount</th>
                  <th className="text-center py-3 px-2">Status</th>
                  <th className="text-right py-3 px-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : data?.transactions.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No deposits found</td></tr>
                ) : (
                  data?.transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/30 hover:bg-white/5">
                      <td className="py-3 px-2 text-white font-medium">{tx.username}</td>
                      <td className="py-3 px-2 text-muted-foreground">{tx.description}</td>
                      <td className="py-3 px-2 text-right text-green-400 font-semibold">{formatCurrency(tx.amount)}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">{tx.status}</Badge>
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground text-xs">
                        {new Date(tx.createdAt).toLocaleString()}
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
