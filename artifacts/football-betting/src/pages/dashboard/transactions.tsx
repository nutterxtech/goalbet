import { useState, useEffect, useRef } from "react";
import { UserLayout } from "@/components/layout/UserLayout";
import { useGetTransactions, useWithdraw } from "@workspace/api-client-react";
import { API_BASE } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter,
} from "@/components/ui/drawer";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ArrowDownToLine, ArrowUpFromLine, Loader2, Smartphone,
  CheckCircle2, Share2, Copy, XCircle, Wallet, TrendingUp, Globe,
} from "lucide-react";
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
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">Wallet</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your funds and transaction history.</p>
      </div>

      {/* Balance Card */}
      <div className="relative rounded-2xl overflow-hidden mb-5 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(220,38,38,0.12)_0%,_transparent_60%)] pointer-events-none" />
        <div className="relative p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Available Balance</span>
          </div>
          <div className="text-4xl sm:text-5xl font-display font-black text-white tracking-tight mb-5">
            {formatCurrency(user?.balance ?? 0)}
          </div>
          <div className="flex gap-2.5">
            <Button
              className="flex-1 h-11 bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-[0_0_16px_rgba(0,230,92,0.25)]"
              onClick={() => setDepositOpen(true)}
            >
              <ArrowDownToLine className="w-4 h-4 mr-1.5" /> Deposit
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 border-white/20 text-white hover:bg-white/10 font-bold"
              onClick={() => setWithdrawOpen(true)}
            >
              <ArrowUpFromLine className="w-4 h-4 mr-1.5" /> Withdraw
            </Button>
          </div>
        </div>
      </div>

      {/* Referral Card */}
      {user?.referralCode && (
        <Card className="border-primary/30 bg-primary/5 mb-5">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Share2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-bold text-primary text-sm">Refer &amp; Earn KSh 5</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share your link — earn <strong className="text-white">KSh 5</strong> for every friend that joins.
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                  <span className="text-xs text-muted-foreground">
                    Friends: <strong className="text-white">{user.referralCount ?? 0}</strong>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Earned: <strong className="text-primary">{formatCurrency(user.referralEarnings ?? 0)}</strong>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <code className="text-xs bg-card border border-border px-2.5 py-1.5 rounded-lg font-mono truncate max-w-[100px]">
                  {user.referralCode}
                </code>
                <Button size="sm" variant="outline" onClick={copyReferralLink}>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Statement */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border/50 bg-secondary/30">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm text-white">Statement</span>
            <Badge variant="secondary" className="text-[10px] h-5 px-2">Last 10</Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !data?.transactions.length ? (
          <div className="text-center p-12 text-muted-foreground text-sm">
            <ArrowDownToLine className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No transactions yet. Make a deposit to get started.
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {data.transactions.map((tx) => {
              const DEBIT_TYPES = ["withdrawal", "bet", "spin_stake"];
              const isCredit = !DEBIT_TYPES.includes(tx.type);

              const typeMap: Record<string, { label: string; icon: string; iconBg: string }> = {
                deposit:        { label: "Deposit",     icon: "↓",  iconBg: "bg-sky-500/15 text-sky-400 border-sky-500/20" },
                withdrawal:     { label: "Withdrawal",  icon: "↑",  iconBg: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
                bet:            { label: "Bet",         icon: "⚽", iconBg: "bg-violet-500/15 text-violet-400 border-violet-500/20" },
                winnings:       { label: "Winnings",    icon: "🏆", iconBg: "bg-primary/15 text-primary border-primary/20" },
                refund:         { label: "Refund",      icon: "↩",  iconBg: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
                referral_bonus: { label: "Referral",    icon: "🎁", iconBg: "bg-pink-500/15 text-pink-400 border-pink-500/20" },
                spin_stake:     { label: "Wheel Spin",  icon: "🎡", iconBg: "bg-violet-500/15 text-violet-400 border-violet-500/20" },
                spin_win:       { label: "Wheel Win",   icon: "⭐", iconBg: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
                adjustment:     { label: "Adjustment",  icon: "⚙",  iconBg: "bg-gray-500/15 text-gray-400 border-gray-500/20" },
              };
              const typeInfo = typeMap[tx.type] ?? { label: tx.type, icon: "•", iconBg: "bg-muted/15 text-muted-foreground border-border/20" };

              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 text-base ${typeInfo.iconBg}`}>
                    {typeInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{typeInfo.label}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide ${
                        tx.status === "completed"
                          ? "bg-green-500/10 text-green-400"
                          : tx.status === "pending"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-red-500/10 text-red-400"
                      }`}>{tx.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{tx.description || "—"}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">{formatDate(tx.createdAt)}</p>
                  </div>
                  <div className={`text-right shrink-0 font-display font-bold text-base ${isCredit ? "text-primary" : "text-destructive"}`}>
                    {isCredit ? "+" : "−"}{formatCurrency(Math.abs(tx.amount))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DepositDrawer open={depositOpen} onOpenChange={setDepositOpen} />
      <WithdrawDrawer open={withdrawOpen} onOpenChange={setWithdrawOpen} />
    </UserLayout>
  );
}

type DepositStep = "amount" | "daraja-waiting" | "pesapal-iframe" | "success" | "failed";

function DepositDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const config = usePublicConfig();
  const minDeposit = config.minDeposit;
  const [amount, setAmount] = useState("100");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<DepositStep>("amount");
  const [sending, setSending] = useState(false);
  const [gateway, setGateway] = useState<"daraja" | "pesapal">("daraja");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [orderTrackingId, setOrderTrackingId] = useState<string | null>(null);
  const [pesapalUrl, setPesapalUrl] = useState<string | null>(null);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeBlocked, setIframeBlocked] = useState(false);
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
        if (data.status === "completed") { clearInterval(pollRef.current!); setStep("success"); refreshBalances(); }
        else if (data.status === "failed") { clearInterval(pollRef.current!); setStep("failed"); }
      } catch {}
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, transactionId]);

  // Safety timeout: if iframe still loading after 12s, assume it's blocked by X-Frame-Options
  useEffect(() => {
    if (step !== "pesapal-iframe" || !iframeLoading || iframeBlocked) return;
    const t = setTimeout(() => { setIframeLoading(false); setIframeBlocked(true); }, 12000);
    return () => clearTimeout(t);
  }, [step, iframeLoading, iframeBlocked]);

  // Poll for Pesapal status (runs while iframe is shown)
  useEffect(() => {
    if (step !== "pesapal-iframe" || !orderTrackingId) return;
    pollRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem("goalbet_token");
        const res = await fetch(`${API_BASE}/user/deposit/pesapal/status/${orderTrackingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.status === "completed") { clearInterval(pollRef.current!); setStep("success"); refreshBalances(); }
        else if (data.status === "failed") { clearInterval(pollRef.current!); setStep("failed"); }
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
        setPesapalUrl(data.redirectUrl);
        setIframeLoading(true);
        setStep("pesapal-iframe");
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
      setPesapalUrl(null);
      setIframeLoading(true);
      setIframeBlocked(false);
    }
    onOpenChange(v);
  }

  const quickAmounts = [minDeposit, minDeposit * 2, minDeposit * 5, minDeposit * 10]
    .filter((v, i, a) => a.indexOf(v) === i);

  const isPesapalIframe = step === "pesapal-iframe";

  return (
    <Drawer open={open} onOpenChange={handleClose} dismissible={!isPesapalIframe}>
      <DrawerContent
        className="bg-card border-border/60 focus:outline-none"
        style={{ maxHeight: isPesapalIframe ? "96dvh" : "88dvh" }}
      >
        <div className="mx-auto w-full max-w-lg flex flex-col h-full">

          {/* ── Amount selection step ── */}
          {step === "amount" && (
            <>
              <DrawerHeader className="pt-2 pb-4 px-5 shrink-0">
                <DrawerTitle className="flex items-center gap-2 text-white">
                  <ArrowDownToLine className="w-5 h-5 text-primary" /> Deposit Funds
                </DrawerTitle>
                <DrawerDescription>
                  Enter the amount to deposit via M-Pesa or card.
                </DrawerDescription>
              </DrawerHeader>

              <div className="px-5 space-y-4 overflow-y-auto flex-1">
                {/* Amount */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    Amount (KSh) — Min {formatCurrency(minDeposit)}
                  </label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder={`e.g. ${minDeposit}`}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="text-xl h-14 font-mono font-bold bg-background border-border"
                  />
                  <div className="flex gap-2 mt-2.5">
                    {quickAmounts.map((val) => (
                      <button
                        key={val}
                        onClick={() => setAmount(val.toString())}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                          amount === String(val)
                            ? "bg-primary/20 border-primary text-primary"
                            : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-white"
                        }`}
                      >
                        {val >= 1000 ? `${val / 1000}K` : val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phone (optional — Pesapal will also ask) */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    M-Pesa Phone <span className="text-muted-foreground/60 font-normal normal-case">(optional — pre-fills Pesapal form)</span>
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      inputMode="tel"
                      placeholder="07XX XXX XXX"
                      value={displayPhone}
                      onChange={e => setPhone(e.target.value)}
                      className="pl-9 h-12 bg-background border-border text-white"
                    />
                  </div>
                </div>

                {parsedAmount >= minDeposit && (
                  <div className="bg-primary/8 border border-primary/25 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">You will deposit</span>
                    <span className="text-lg font-display font-black text-primary">{formatCurrency(parsedAmount)}</span>
                  </div>
                )}
              </div>

              <DrawerFooter className="px-5 pt-4 pb-6 shrink-0">
                <Button
                  className="w-full h-12 text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,230,92,0.3)]"
                  onClick={initiateDeposit}
                  disabled={parsedAmount < minDeposit || sending}
                >
                  {sending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...</>
                    : <><ArrowDownToLine className="w-4 h-4 mr-2" /> Proceed</>
                  }
                </Button>
                <Button variant="ghost" className="text-muted-foreground" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
              </DrawerFooter>
            </>
          )}

          {/* ── Daraja STK waiting ── */}
          {step === "daraja-waiting" && (
            <>
              <DrawerHeader className="pt-2 pb-2 px-5 shrink-0">
                <DrawerTitle className="flex items-center gap-2 text-white">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" /> Check Your Phone
                </DrawerTitle>
                <DrawerDescription>
                  An M-Pesa PIN prompt has been sent. Enter your PIN to complete.
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-5 py-6 flex flex-col items-center gap-5 flex-1">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                  <div className="relative w-24 h-24 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center">
                    <Smartphone className="w-11 h-11 text-primary animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-lg font-display font-bold text-white">STK Push Sent</p>
                  <p className="text-sm text-muted-foreground">
                    Prompt for <strong className="text-white">{formatCurrency(parsedAmount)}</strong> sent to{" "}
                    <strong className="text-white">{displayPhone}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Enter your M-Pesa PIN on your phone.</p>
                </div>
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
              <DrawerFooter className="px-5 pt-0 pb-6 shrink-0">
                <Button variant="ghost" className="text-muted-foreground text-sm" onClick={() => handleClose(false)}>
                  Cancel payment
                </Button>
              </DrawerFooter>
            </>
          )}

          {/* ── Pesapal embedded iframe ── */}
          {step === "pesapal-iframe" && (
            <>
              {/* Compact header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-white">Secure Payment</span>
                  <span className="text-[10px] bg-blue-500/15 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full font-semibold">
                    Pesapal
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-display font-black text-primary">{formatCurrency(parsedAmount)}</span>
                  <button
                    onClick={() => handleClose(false)}
                    className="text-muted-foreground hover:text-white transition-colors ml-2 text-xs font-semibold"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              {/* Iframe container */}
              <div className="flex-1 relative overflow-hidden" style={{ background: "#fff" }}>
                {/* Loading spinner — shown until iframe fires onLoad */}
                {iframeLoading && !iframeBlocked && (
                  <div className="absolute inset-0 bg-card flex flex-col items-center justify-center gap-4 z-10">
                    <div className="w-12 h-12 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-white">Loading secure payment...</p>
                      <p className="text-xs text-muted-foreground mt-1">Powered by Pesapal</p>
                    </div>
                  </div>
                )}

                {/* Fallback when iframe is blocked by browser security (X-Frame-Options) */}
                {iframeBlocked && (
                  <div className="absolute inset-0 bg-card flex flex-col items-center justify-center gap-5 z-10 p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                      <Globe className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">Open Pesapal to Pay</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pesapal requires its own window. Tap below to pay — your balance updates here automatically.
                      </p>
                    </div>
                    <Button
                      className="w-full h-12 font-bold bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => { if (pesapalUrl) window.open(pesapalUrl, "_blank", "noopener"); }}
                    >
                      <Globe className="w-4 h-4 mr-2" /> Open Pesapal Payment Page
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      After completing payment, return here — your deposit will be confirmed automatically.
                    </p>
                  </div>
                )}

                {pesapalUrl && !iframeBlocked && (
                  <iframe
                    src={pesapalUrl}
                    className="w-full h-full border-0"
                    style={{ minHeight: "500px" }}
                    title="Pesapal Payment"
                    allow="payment *"
                    onLoad={() => setIframeLoading(false)}
                    onError={() => { setIframeLoading(false); setIframeBlocked(true); }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  />
                )}
              </div>

              {/* Bottom polling indicator */}
              <div className="px-4 py-2.5 border-t border-border/40 bg-card/80 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400/60 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {iframeBlocked ? "Waiting for payment to complete..." : "Watching for payment confirmation..."}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground/60">🔒 Secure</span>
              </div>
            </>
          )}

          {/* ── Success ── */}
          {step === "success" && (
            <>
              <DrawerHeader className="pt-2 pb-2 px-5 shrink-0">
                <DrawerTitle className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="w-5 h-5" /> Deposit Confirmed!
                </DrawerTitle>
              </DrawerHeader>
              <div className="px-5 py-6 flex flex-col items-center gap-4 flex-1">
                <div className="w-24 h-24 rounded-full bg-primary/15 border-2 border-primary flex items-center justify-center shadow-[0_0_30px_rgba(0,230,92,0.3)]">
                  <CheckCircle2 className="w-12 h-12 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-3xl font-display font-black text-primary">{formatCurrency(parsedAmount)}</p>
                  <p className="text-muted-foreground text-sm mt-1">added to your wallet</p>
                  {gateway === "pesapal" && <p className="text-[11px] text-blue-400 mt-1">via Pesapal</p>}
                </div>
              </div>
              <DrawerFooter className="px-5 pt-0 pb-6 shrink-0">
                <Button className="w-full font-bold bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => handleClose(false)}>
                  Done
                </Button>
              </DrawerFooter>
            </>
          )}

          {/* ── Failed ── */}
          {step === "failed" && (
            <>
              <DrawerHeader className="pt-2 pb-2 px-5 shrink-0">
                <DrawerTitle className="flex items-center gap-2 text-destructive">
                  <XCircle className="w-5 h-5" /> Payment Not Completed
                </DrawerTitle>
                <DrawerDescription>
                  The payment was not confirmed. No funds were deducted.
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-5 py-4 flex flex-col items-center gap-4 flex-1">
                <div className="w-20 h-20 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-destructive" />
                </div>
              </div>
              <DrawerFooter className="px-5 pt-0 pb-6 shrink-0 flex-row gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>Close</Button>
                <Button className="flex-1 bg-primary text-primary-foreground" onClick={() => { setStep("amount"); setIframeLoading(true); setIframeBlocked(false); }}>
                  Try Again
                </Button>
              </DrawerFooter>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function WithdrawDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
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
  const fee = numAmount * (feePercent / 100);
  const netAmount = numAmount - fee;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-card border-border/60 focus:outline-none max-h-[88dvh]">
        <div className="mx-auto w-full max-w-md pb-6">
          <DrawerHeader className="pt-2 pb-4 px-5">
            <DrawerTitle className="flex items-center gap-2 text-white">
              <ArrowUpFromLine className="w-5 h-5 text-amber-400" /> Request Withdrawal
            </DrawerTitle>
            <DrawerDescription>
              Min {formatCurrency(minWithdrawal)} · {feePercent}% processing fee applies.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Amount (KSh)
              </label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder={`Min ${minWithdrawal}`}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="text-xl h-14 font-mono font-bold bg-background border-border"
              />
            </div>

            {numAmount >= minWithdrawal && (
              <div className="bg-secondary/50 border border-border/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Processing fee ({feePercent}%)</span>
                  <span>−{formatCurrency(fee)}</span>
                </div>
                <div className="flex justify-between font-bold text-white border-t border-border/40 pt-2">
                  <span>You will receive</span>
                  <span className="text-primary text-base">{formatCurrency(netAmount)}</span>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Payment Details
              </label>
              <Textarea
                placeholder="Enter your M-Pesa number or bank details"
                value={details}
                onChange={e => setDetails(e.target.value)}
                className="bg-background border-border min-h-[80px]"
              />
            </div>
          </div>

          <DrawerFooter className="px-5 pt-4">
            <Button
              className="w-full h-12 font-bold"
              onClick={() => mutation.mutate({ data: { amount: numAmount, accountDetails: details } })}
              disabled={mutation.isPending || numAmount < minWithdrawal || !details.trim()}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
            <Button variant="ghost" className="text-muted-foreground" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
