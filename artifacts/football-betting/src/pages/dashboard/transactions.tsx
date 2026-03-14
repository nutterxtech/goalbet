import { useState, useEffect, useRef } from "react";
import { UserLayout } from "@/components/layout/UserLayout";
import { useGetTransactions, useWithdraw } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowDownToLine, ArrowUpFromLine, Loader2, Smartphone, CheckCircle2, Share2, Copy, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function TransactionsPage() {
  const { data, isLoading } = useGetTransactions({ page: 1, limit: 50 });
  const { user } = useAuth();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const { toast } = useToast();

  const referralLink = user?.referralCode
    ? `${window.location.origin}${import.meta.env.BASE_URL}register?ref=${user.referralCode}`
    : "";

  function copyReferralLink() {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    }
  }

  return (
    <UserLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Wallet</h1>
          <p className="text-muted-foreground mt-1">Manage your funds and transaction history.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => setDepositOpen(true)}>
            <ArrowDownToLine className="w-4 h-4 mr-2" /> Deposit
          </Button>
          <Button className="bg-white text-black hover:bg-gray-200" onClick={() => setWithdrawOpen(true)}>
            <ArrowUpFromLine className="w-4 h-4 mr-2" /> Withdraw
          </Button>
        </div>
      </div>

      {/* Referral Card */}
      {user?.referralCode && (
        <Card className="border-primary/30 bg-primary/5 mb-6">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Share2 className="w-4 h-4 text-primary" />
                  <span className="font-bold text-primary">Refer &amp; Earn KSh 5</span>
                </div>
                <p className="text-sm text-muted-foreground">Share your referral link — earn <strong className="text-white">KSh 5</strong> for every friend that joins.</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-muted-foreground">Friends referred: <strong className="text-white">{user.referralCount ?? 0}</strong></span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">Total earned: <strong className="text-primary">{formatCurrency(user.referralEarnings ?? 0)}</strong></span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <code className="text-xs bg-card border border-border px-3 py-2 rounded-lg font-mono">{user.referralCode}</code>
                <Button size="sm" variant="outline" className="shrink-0" onClick={copyReferralLink}>
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 bg-card/80 backdrop-blur overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : data?.transactions.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              No transactions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.transactions.map((tx) => (
                    <TableRow key={tx.id} className="border-border/50 hover:bg-secondary/20">
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {formatDate(tx.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span className="capitalize text-xs font-bold tracking-wider">{tx.type}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {tx.description || '-'}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${tx.amount > 0 ? 'text-primary' : 'text-destructive'}`}>
                        {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'completed' ? 'default' : tx.status === 'rejected' ? 'destructive' : 'secondary'} className={tx.status === 'completed' ? 'bg-primary/20 text-primary hover:bg-primary/30' : ''}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DepositModal open={depositOpen} onOpenChange={setDepositOpen} />
      <WithdrawModal open={withdrawOpen} onOpenChange={setWithdrawOpen} />
    </UserLayout>
  );
}

function DepositModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [amount, setAmount] = useState("100");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"amount" | "waiting" | "success" | "failed">("amount");
  const [sending, setSending] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const parsedAmount = parseFloat(amount) || 0;
  const displayPhone = phone || user?.phone || "";

  useEffect(() => {
    if (user?.phone && !phone) setPhone(user.phone);
  }, [user]);

  // Poll for payment status when waiting
  useEffect(() => {
    if (step !== "waiting" || !transactionId) return;

    pollRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem("goalbet_token");
        const res = await fetch(`/api/user/deposit/mpesa/status/${transactionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.status === "completed") {
          clearInterval(pollRef.current!);
          setStep("success");
          queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
          queryClient.invalidateQueries({ queryKey: ["/api/user/transactions"] });
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!);
          setStep("failed");
        }
      } catch {}
    }, 3000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, transactionId]);

  async function sendSTKPush() {
    if (parsedAmount < 20 || !displayPhone) return;
    setSending(true);
    try {
      const token = localStorage.getItem("goalbet_token");
      const res = await fetch("/api/user/deposit/mpesa", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parsedAmount, phone: displayPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send M-Pesa prompt");
      setTransactionId(data.transactionId);
      setStep("waiting");
    } catch (err: any) {
      toast({ title: "M-Pesa Error", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  function handleClose(v: boolean) {
    if (!v) {
      if (pollRef.current) clearInterval(pollRef.current);
      setStep("amount");
      setAmount("100");
      setTransactionId(null);
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-border bg-card max-w-sm">
        {step === "amount" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Smartphone className="w-5 h-5 text-primary" /> Deposit via M-Pesa</DialogTitle>
              <DialogDescription>An STK push will be sent to your phone. Min KSh 20.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Amount (KSh)</label>
                <Input
                  type="number"
                  placeholder="e.g. 100"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="text-lg h-12 font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">M-Pesa Phone Number</label>
                <Input
                  type="tel"
                  placeholder="+254712345678"
                  value={displayPhone}
                  onChange={e => setPhone(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button
                className="w-full h-12 font-bold"
                onClick={sendSTKPush}
                disabled={parsedAmount < 20 || !displayPhone || sending}
              >
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Smartphone className="w-4 h-4 mr-2" />}
                Send M-Pesa Prompt — {parsedAmount >= 20 ? formatCurrency(parsedAmount) : 'KSh 0'}
              </Button>
            </div>
          </>
        )}

        {step === "waiting" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                Waiting for M-Pesa...
              </DialogTitle>
              <DialogDescription>Check your phone and enter your M-Pesa PIN to confirm the payment.</DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4 text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                <Smartphone className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-white">STK Push Sent</p>
                <p className="text-sm text-muted-foreground">
                  An M-Pesa prompt for <strong className="text-white">{formatCurrency(parsedAmount)}</strong> was sent to <strong className="text-white">{displayPhone}</strong>.
                </p>
                <p className="text-xs text-muted-foreground mt-2">Enter your PIN on your phone to complete the deposit.</p>
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => handleClose(false)}>
                Cancel
              </Button>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="w-5 h-5" /> Deposit Successful!
              </DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-black text-primary">{formatCurrency(parsedAmount)}</p>
                <p className="text-muted-foreground text-sm mt-1">has been added to your wallet</p>
              </div>
              <Button className="w-full" onClick={() => handleClose(false)}>Done</Button>
            </div>
          </>
        )}

        {step === "failed" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" /> Payment Cancelled
              </DialogTitle>
              <DialogDescription>The M-Pesa payment was not completed. No funds were deducted.</DialogDescription>
            </DialogHeader>
            <div className="py-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>Close</Button>
              <Button className="flex-1" onClick={() => setStep("amount")}>Try Again</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function WithdrawModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const mutation = useWithdraw({
    mutation: {
      onSuccess: () => {
        toast({ title: "Withdrawal Requested", description: "Your request is pending admin approval." });
        queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/transactions"] });
        onOpenChange(false);
        setAmount("");
        setDetails("");
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  });

  const numAmount = parseFloat(amount) || 0;
  const netAmount = numAmount * 0.88; // 12% fee

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card">
        <DialogHeader>
          <DialogTitle>Request Withdrawal</DialogTitle>
          <DialogDescription>Withdraw your winnings (Min KSh 50).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Amount (KSh)</label>
            <Input 
              type="number" 
              placeholder="e.g. 500" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          
          {numAmount >= 50 && (
            <div className="p-3 bg-secondary/50 rounded-lg text-sm border border-border/50">
              <div className="flex justify-between font-bold text-white">
                <span>You will receive:</span>
                <span className="text-primary">{formatCurrency(netAmount)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Payment Details (e.g. M-PESA Number)</label>
            <Textarea 
              placeholder="Enter your mobile number or bank details" 
              value={details} 
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          <Button 
            className="w-full" 
            onClick={() => mutation.mutate({ data: { amount: numAmount, accountDetails: details } })}
            disabled={mutation.isPending || numAmount < 50 || !details.trim()}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
