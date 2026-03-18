import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminGetDeposits } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";
import { CheckCircle2, AlertTriangle, Loader2, Clock, XCircle } from "lucide-react";

function statusBadge(status: string) {
  if (status === "completed") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Completed</Badge>;
  if (status === "pending") return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
  if (status === "failed") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Failed</Badge>;
  if (status === "rejected") return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs flex items-center gap-1"><XCircle className="w-3 h-3" />Cancelled</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

interface CancelTarget { id: string; amount: number; username: string }

export default function AdminDeposits() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminGetDeposits({ page, limit: 20 }, { query: { refetchInterval: 10000 } });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [crediting, setCrediting] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);
  const [cancelReason, setCancelReason] = useState("Payment not received");

  async function creditDeposit(transactionId: string, amount: number, username: string) {
    if (!confirm(`Manually credit ${formatCurrency(amount)} to ${username}? This credits their wallet immediately.`)) return;
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
        description: `${formatCurrency(amount)} credited to ${username}. New balance: ${formatCurrency(result.newBalance)}`,
      });
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCrediting(null);
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(cancelTarget.id);
    try {
      const token = localStorage.getItem("goalbet_token");
      const res = await fetch(`${API_BASE}/admin/deposits/${cancelTarget.id}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: cancelReason.trim() || "Payment not received" }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      toast({
        title: "Deposit Cancelled",
        description: `Deposit of ${formatCurrency(cancelTarget.amount)} for ${cancelTarget.username} has been cancelled. User notified.`,
      });
      queryClient.invalidateQueries();
      setCancelTarget(null);
      setCancelReason("Payment not received");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCancelling(null);
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
            <strong>{pendingCount}</strong> deposit{pendingCount > 1 ? "s" : ""} pending or failed.{" "}
            Use <strong className="text-green-400">Credit</strong> if money was received,
            or <strong className="text-red-400">Cancel</strong> if the payment was not actually received.
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
                  <th className="text-center py-3 px-2 min-w-[160px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : data?.transactions.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No deposits found</td></tr>
                ) : (
                  data?.transactions.map((tx) => {
                    const canAct = tx.status === "pending" || tx.status === "failed";
                    const isCreditLoading = crediting === tx.id;
                    const isCancelLoading = cancelling === tx.id;
                    const busy = isCreditLoading || isCancelLoading || !!crediting || !!cancelling;
                    return (
                      <tr key={tx.id} className={`border-b border-border/30 hover:bg-white/5 ${canAct ? "bg-yellow-500/5" : ""}`}>
                        <td className="py-3 px-2 text-white font-medium">{tx.username}</td>
                        <td className="py-3 px-2 text-muted-foreground text-xs max-w-[200px] truncate">{tx.description}</td>
                        <td className="py-3 px-2 text-right text-green-400 font-semibold">{formatCurrency(tx.amount)}</td>
                        <td className="py-3 px-2 text-center">{statusBadge(tx.status)}</td>
                        <td className="py-3 px-2 text-right text-muted-foreground text-xs">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-2">
                          {canAct ? (
                            <div className="flex gap-1.5 justify-center">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => creditDeposit(tx.id, tx.amount, tx.username)}
                                className="h-7 px-2.5 text-xs border-green-500/40 text-green-400 hover:bg-green-500/10 gap-1"
                              >
                                {isCreditLoading
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <CheckCircle2 className="w-3 h-3" />}
                                {isCreditLoading ? "…" : "Credit"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => { setCancelTarget({ id: tx.id, amount: tx.amount, username: tx.username }); setCancelReason("Payment not received"); }}
                                className="h-7 px-2.5 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10 gap-1"
                              >
                                {isCancelLoading
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <XCircle className="w-3 h-3" />}
                                {isCancelLoading ? "…" : "Cancel"}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs block text-center">—</span>
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

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(v) => { if (!v && !cancelling) setCancelTarget(null); }}>
        <DialogContent className="sm:max-w-md bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              Cancel Deposit
            </DialogTitle>
          </DialogHeader>

          {cancelTarget && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                You are about to cancel the {formatCurrency(cancelTarget.amount)} deposit
                by <strong>{cancelTarget.username}</strong>.{" "}
                <span className="text-muted-foreground">No balance will be credited. The user will be notified.</span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-sm">Reason (shown to user)</Label>
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Payment not received"
                  className="bg-background border-border"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={!!cancelling}>
              Keep Pending
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={!!cancelling}
              className="gap-2"
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              {cancelling ? "Cancelling…" : "Yes, Cancel Deposit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
