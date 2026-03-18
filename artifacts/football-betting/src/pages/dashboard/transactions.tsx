import { useState, useEffect, useRef } from "react";
import { UserLayout } from "@/components/layout/UserLayout";
import { useGetTransactions, useWithdraw } from "@workspace/api-client-react";
import { API_BASE } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { Card, CardContent } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowDownToLine, ArrowUpFromLine, Loader2, Smartphone, CheckCircle2, Share2, Copy, XCircle, Globe, ExternalLink, Wallet, TrendingDown, TrendingUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function TransactionsPage() {
  const { data, isLoading } = useGetTransactions({ page: 1, limit: 10 });
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
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-white">Wallet</h1>
        <p className="text-muted-foreground mt-1">Manage your funds and transaction history.</p>
      </div>

      {/* Balance Card */}
      <div className="relative rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(220,38,38,0.15)_0%,_transparent_60%)] pointer-events-none" />
        <div className="relative p-6">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground font-medium">Available Balance</span>
          </div>
          <div className="text-5xl font-display font-black text-white tracking-tight mb-6">
            {formatCurrency(user?.balance ?? 0)}
          </div>
          <div className="flex gap-3">
            <Button
              className="flex-1 h-11 bg-primary text-primary-foreground font-bold hover:bg-primary/90"
              onClick={() => setDepositOpen(true)}
            >
              <ArrowDownToLine className="w-4 h-4 mr-2" /> Deposit
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 border-white/20 text-white hover:bg-white/10 font-bold"
              onClick={() => setWithdrawOpen(true)}
            >
              <ArrowUpFromLine className="w-4 h-4 mr-2" /> Withdraw
            </Button>
          </div>
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

      {/* Transaction Statement */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        {/* Statement header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-secondary/30">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm text-white">Statement</span>
            <Badge variant="secondary" className="text-[10px] h-5 px-2">Last 10</Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !data?.transactions.length ? (
          <div className="text-center p-12 text-muted-foreground">
            <ArrowDownToLine className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No transactions yet. Make a deposit to get started.
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {data.transactions.map((tx, idx) => {
              const isCredit = tx.amount > 0;
              const typeMap: Record<string, { label: string; color: string }> = {
                deposit:     { label: "Deposit",      color: "text-sky-400" },
                withdrawal:  { label: "Withdrawal",   color: "text-amber-400" },
                bet:         { label: "Bet Placed",   color: "text-violet-400" },
                winnings:    { label: "Winnings",     color: "text-primary" },
                refund:      { label: "Refund",       color: "text-blue-400" },
                referral:    { label: "Referral",     color: "text-pink-400" },
                spin_stake:  { label: "Wheel Spin",   color: "text-violet-400" },
                spin_win:    { label: "Wheel Win",    color: "text-yellow-400" },
              };
              const typeInfo = typeMap[tx.type] ?? { label: tx.type, color: "text-muted-foreground" };

              return (
                <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/20 transition-colors">
                  {/* Index */}
                  <span className="text-[10px] text-muted-foreground/50 w-4 shrink-0 font-mono">{idx + 1}</span>

                  {/* Type indicator dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isCredit ? "bg-primary" : "bg-destructive"}`} />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${typeInfo.color}`}>{typeInfo.label}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        tx.status === "completed"
                          ? "bg-green-500/10 text-green-400"
                          : tx.status === "pending"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-red-500/10 text-red-400"
                      }`}>{tx.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xs">
                      {tx.description || "—"}
                    </p>
                  </div>

                  {/* Amount + date */}
                  <div className="text-right shrink-0">
                    <p className={`font-display font-bold text-sm ${isCredit ? "text-primary" : "text-destructive"}`}>
                      {isCredit ? "+" : ""}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{formatDate(tx.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DepositModal open={depositOpen} onOpenChange={setDepositOpen} />
      <WithdrawModal open={withdrawOpen} onOpenChange={setWithdrawOpen} />
    </UserLayout>
  );
}

function DepositModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const config = usePublicConfig();
  const minDeposit = config.minDeposit;
  const [amount, setAmount] = useState("100");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"amount" | "daraja-waiting" | "pesapal-redirect" | "pesapal-waiting" | "success" | "failed">("amount");
  const [sending, setSending] = useState(false);
  const [gateway, setGateway] = useState<"daraja" | "pesapal">("daraja");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [orderTrackingId, setOrderTrackingId] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const parsedAmount = parseFloat(amount) || 0;
  const displayPhone = phone || user?.phone || "";

  useEffect(() => {
    if (user?.phone && !phone) setPhone(user.phone);
  }, [user]);

  function refreshBalances() {
    queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user/transactions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }

  // Poll for Daraja status
  useEffect(() => {
    if (step !== "daraja-waiting" || !transactionId) return;
    pollRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem("goalbet_token");
        const res = await fetch(`${API_BASE}/user/deposit/mpesa/status/${transactionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.status === "completed") {
          clearInterval(pollRef.current!);
          setStep("success");
          refreshBalances();
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!);
          setStep("failed");
        }
      } catch {}
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, transactionId]);

  // Poll for Pesapal status
  useEffect(() => {
    if (step !== "pesapal-waiting" || !orderTrackingId) return;
    pollRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem("goalbet_token");
        const res = await fetch(`${API_BASE}/user/deposit/pesapal/status/${orderTrackingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.status === "completed") {
          clearInterval(pollRef.current!);
          setStep("success");
          refreshBalances();
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!);
          setStep("failed");
        }
      } catch {}
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, orderTrackingId]);

  async function initiateDeposit() {
    if (parsedAmount < minDeposit) return;
    setSending(true);
    try {
      const token = localStorage.getItem("goalbet_token");
      const res = await fetch(`${API_BASE}/user/deposit/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parsedAmount, phone: displayPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to initiate deposit");

      setGateway(data.method);
      setTransactionId(data.transactionId);

      if (data.method === "daraja") {
        setStep("daraja-waiting");
      } else if (data.method === "pesapal") {
        setOrderTrackingId(data.orderTrackingId);
        setRedirectUrl(data.redirectUrl);
        setStep("pesapal-redirect");
      }
    } catch (err: any) {
      toast({ title: "Deposit Error", description: err.message, variant: "destructive" });
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
      setOrderTrackingId(null);
      setRedirectUrl(null);
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-border bg-card max-w-sm">

        {/* ── Step: Enter amount ── */}
        {step === "amount" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-primary" /> Deposit Funds
              </DialogTitle>
              <DialogDescription>Enter the amount to deposit. Min {formatCurrency(minDeposit)}.</DialogDescription>
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
                <label className="text-sm text-muted-foreground">M-Pesa Phone (optional for Pesapal)</label>
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
                onClick={initiateDeposit}
                disabled={parsedAmount < minDeposit || sending}
              >
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowDownToLine className="w-4 h-4 mr-2" />}
                {sending ? "Connecting..." : `Deposit ${parsedAmount >= minDeposit ? formatCurrency(parsedAmount) : formatCurrency(0)}`}
              </Button>
            </div>
          </>
        )}

        {/* ── Step: Daraja STK waiting ── */}
        {step === "daraja-waiting" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" /> Waiting for M-Pesa...
              </DialogTitle>
              <DialogDescription>Check your phone and enter your M-Pesa PIN to confirm.</DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4 text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                <Smartphone className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-white">STK Push Sent</p>
                <p className="text-sm text-muted-foreground">
                  Prompt for <strong className="text-white">{formatCurrency(parsedAmount)}</strong> sent to{" "}
                  <strong className="text-white">{displayPhone}</strong>.
                </p>
                <p className="text-xs text-muted-foreground mt-2">Enter your PIN on your phone to complete the deposit.</p>
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => handleClose(false)}>
                Cancel
              </Button>
            </div>
          </>
        )}

        {/* ── Step: Pesapal redirect ── */}
        {step === "pesapal-redirect" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" /> Complete Payment via Pesapal
              </DialogTitle>
              <DialogDescription>Click below to open the secure Pesapal payment page.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center">
                <Globe className="w-10 h-10 text-blue-400" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-white">{formatCurrency(parsedAmount)} ready to pay</p>
                <p className="text-sm text-muted-foreground">
                  Complete payment securely on Pesapal. Supports M-Pesa, cards, and more.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  className="w-full h-12 font-bold bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    if (redirectUrl) {
                      window.open(redirectUrl, "_blank", "noopener,noreferrer");
                      setStep("pesapal-waiting");
                    }
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" /> Open Pesapal Payment Page
                </Button>
                <p className="text-xs text-muted-foreground">After paying, return here — your balance will update automatically.</p>
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => handleClose(false)}>
                Cancel
              </Button>
            </div>
          </>
        )}

        {/* ── Step: Pesapal waiting (after redirect opened) ── */}
        {step === "pesapal-waiting" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" /> Waiting for Pesapal...
              </DialogTitle>
              <DialogDescription>Complete your payment on the Pesapal page. This will update automatically.</DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4 text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center">
                <Globe className="w-10 h-10 text-blue-400 animate-pulse" />
              </div>
              <p className="text-sm text-muted-foreground">
                Waiting for confirmation of <strong className="text-white">{formatCurrency(parsedAmount)}</strong>.
              </p>
              <div className="flex gap-2">
                {redirectUrl && (
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-blue-400 border-blue-500/40"
                    onClick={() => window.open(redirectUrl, "_blank", "noopener,noreferrer")}>
                    <ExternalLink className="w-3.5 h-3.5" /> Reopen Payment
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── Step: Success ── */}
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
                {gateway === "pesapal" && (
                  <p className="text-xs text-blue-400 mt-1">via Pesapal</p>
                )}
              </div>
              <Button className="w-full" onClick={() => handleClose(false)}>Done</Button>
            </div>
          </>
        )}

        {/* ── Step: Failed ── */}
        {step === "failed" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" /> Payment Cancelled
              </DialogTitle>
              <DialogDescription>
                {gateway === "pesapal"
                  ? "The Pesapal payment was not completed. No funds were deducted."
                  : "The M-Pesa payment was not completed. No funds were deducted."}
              </DialogDescription>
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
  const config = usePublicConfig();
  const minWithdrawal = config.minWithdrawal;
  const feePercent = config.withdrawalFeePercent;
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
  const netAmount = numAmount * (1 - feePercent / 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card">
        <DialogHeader>
          <DialogTitle>Request Withdrawal</DialogTitle>
          <DialogDescription>Withdraw your winnings (Min {formatCurrency(minWithdrawal)}, {feePercent}% fee).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Amount (KSh)</label>
            <Input 
              type="number" 
              placeholder={`e.g. ${minWithdrawal * 10}`}
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          
          {numAmount >= minWithdrawal && (
            <div className="p-3 bg-secondary/50 rounded-lg text-sm border border-border/50 space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Fee ({feePercent}%)</span>
                <span>-{formatCurrency(numAmount * (feePercent / 100))}</span>
              </div>
              <div className="flex justify-between font-bold text-white border-t border-border/40 pt-1">
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
            disabled={mutation.isPending || numAmount < minWithdrawal || !details.trim()}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
