import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminGetDeposits } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";
import { CheckCircle2, AlertTriangle, Loader2, Clock } from "lucide-react";

function statusBadge(status: string) {
  if (status === "completed") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Completed</Badge>;
  if (status === "pending") return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
  if (status === "failed") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Failed</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

export default function AdminDeposits() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminGetDeposits({ page, limit: 20 }, { query: { refetchInterval: 10000 } });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [crediting, setCrediting] = useState<string | null>(null);

  async function creditDeposit(transactionId: string, amount: number, username: string) {
    if (!confirm(`Manually credit KSh ${amount} to ${username}? This credits their wallet immediately.`)) return;
    setCrediting(transactionId);
    try {
      const token = localStorage.getItem("goalbet_token");
      const res = await fetch(`${API_BASE}/admin/deposits/${transactionId}/credit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      toast({
        title: "Deposit Credited",
        description: `KSh ${amount} credited to ${username}. New balance: KSh ${result.newBalance?.toFixed(2)}`,
      });
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCrediting(null);
    }
  }

  const pendingCount = data?.transactions.filter(t => t.status === "pending" || t.status === "failed").length ?? 0;

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Deposits</h1>
        <p className="text-muted-foreground mt-1">All user deposits on the platform</p>
      </div>

      {pendingCount > 0 && (
        <div className="mb-4 flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            <strong>{pendingCount}</strong> deposit{pendingCount > 1 ? "s" : ""} pending or failed. If M-Pesa money was deducted but the status didn't update, use <strong>Credit</strong> to manually credit the user's wallet.
          </span>
        </div>
      )}

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
                  <th className="text-center py-3 px-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : data?.transactions.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No deposits found</td></tr>
                ) : (
                  data?.transactions.map((tx) => {
                    const canCredit = tx.status === "pending" || tx.status === "failed";
                    const isLoading = crediting === tx.id;
                    return (
                      <tr key={tx.id} className={`border-b border-border/30 hover:bg-white/5 ${canCredit ? "bg-yellow-500/5" : ""}`}>
                        <td className="py-3 px-2 text-white font-medium">{tx.username}</td>
                        <td className="py-3 px-2 text-muted-foreground text-xs max-w-[200px] truncate">{tx.description}</td>
                        <td className="py-3 px-2 text-right text-green-400 font-semibold">{formatCurrency(tx.amount)}</td>
                        <td className="py-3 px-2 text-center">{statusBadge(tx.status)}</td>
                        <td className="py-3 px-2 text-right text-muted-foreground text-xs">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {canCredit ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!!crediting}
                              onClick={() => creditDeposit(tx.id, tx.amount, tx.username)}
                              className="h-7 px-3 text-xs border-green-500/40 text-green-400 hover:bg-green-500/10 gap-1"
                            >
                              {isLoading
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <CheckCircle2 className="w-3 h-3" />}
                              {isLoading ? "Crediting…" : "Credit"}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
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
