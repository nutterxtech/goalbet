import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminGetConfig, adminUpdateConfig } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Settings, Smartphone, CheckCircle2, Eye, EyeOff, Globe, RefreshCw, AlertCircle, Zap } from "lucide-react";
import { API_BASE } from "@/lib/api";

interface ConfigForm {
  minDeposit: number;
  minBet: number;
  minWithdrawal: number;
  withdrawalFeePercent: number;
  bettingWindowMinutes: number;
  matchDurationSeconds: number;
  maxBetAmount: number;
  consolationRefundPercent: number;
  referralRewardAmount: number;
}

interface MpesaForm {
  mpesaConsumerKey: string;
  mpesaConsumerSecret: string;
  mpesaShortCode: string;
  mpesaPasskey: string;
  mpesaCallbackUrl: string;
  mpesaEnvironment: "sandbox" | "production";
}

interface PesapalForm {
  pesapalConsumerKey: string;
  pesapalConsumerSecret: string;
  pesapalCallbackUrl: string;
  pesapalIpnUrl: string;
  pesapalEnvironment: "sandbox" | "live";
}

const METHOD_OPTIONS = [
  {
    value: "auto",
    label: "Auto (Smart Fallback)",
    desc: "Tries Daraja first; if it fails or isn't configured, falls back to Pesapal automatically.",
    icon: Zap,
    color: "text-yellow-400",
  },
  {
    value: "daraja",
    label: "M-Pesa Daraja Only",
    desc: "Always use Safaricom Daraja STK push for all deposits. Pesapal is ignored.",
    icon: Smartphone,
    color: "text-primary",
  },
  {
    value: "pesapal",
    label: "Pesapal Only",
    desc: "Always use Pesapal payment page for all deposits. Daraja is ignored.",
    icon: Globe,
    color: "text-blue-400",
  },
];

export default function AdminConfig() {
  const { data, isLoading } = useAdminGetConfig();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ConfigForm>();
  const mpesaForm = useForm<MpesaForm>({ defaultValues: { mpesaEnvironment: "sandbox" } });
  const pesapalForm = useForm<PesapalForm>({ defaultValues: { pesapalEnvironment: "sandbox" } });
  const [showMpesaSecrets, setShowMpesaSecrets] = useState(false);
  const [showPesapalSecrets, setShowPesapalSecrets] = useState(false);
  const [savingMpesa, setSavingMpesa] = useState(false);
  const [savingPesapal, setSavingPesapal] = useState(false);
  const [switchingMethod, setSwitchingMethod] = useState(false);
  const [registeringIpn, setRegisteringIpn] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>("auto");

  useEffect(() => {
    if (data) {
      reset(data as any);
      mpesaForm.reset({
        mpesaShortCode: (data as any).mpesaShortCode || "",
        mpesaCallbackUrl: (data as any).mpesaCallbackUrl || "",
        mpesaEnvironment: (data as any).mpesaEnvironment || "sandbox",
        mpesaConsumerKey: "",
        mpesaConsumerSecret: "",
        mpesaPasskey: "",
      });
      pesapalForm.reset({
        pesapalCallbackUrl: (data as any).pesapalCallbackUrl || "",
        pesapalIpnUrl: (data as any).pesapalIpnUrl || "",
        pesapalEnvironment: (data as any).pesapalEnvironment || "sandbox",
        pesapalConsumerKey: "",
        pesapalConsumerSecret: "",
      });
      setSelectedMethod((data as any).activePaymentMethod || "auto");
    }
  }, [data, reset]);

  const onSubmit = async (values: ConfigForm) => {
    try {
      await adminUpdateConfig({
        minDeposit: Number(values.minDeposit),
        minBet: Number(values.minBet),
        minWithdrawal: Number(values.minWithdrawal),
        withdrawalFeePercent: Number(values.withdrawalFeePercent),
        bettingWindowMinutes: Number(values.bettingWindowMinutes),
        matchDurationSeconds: Number(values.matchDurationSeconds),
        maxBetAmount: Number(values.maxBetAmount),
        consolationRefundPercent: Number(values.consolationRefundPercent),
        referralRewardAmount: Number(values.referralRewardAmount),
      } as any);
      queryClient.invalidateQueries();
      toast({ title: "Config updated", description: "Platform configuration saved." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const onMpesaSubmit = async (values: MpesaForm) => {
    setSavingMpesa(true);
    try {
      await adminUpdateConfig({
        mpesaShortCode: values.mpesaShortCode,
        mpesaCallbackUrl: values.mpesaCallbackUrl,
        mpesaEnvironment: values.mpesaEnvironment,
        ...(values.mpesaConsumerKey ? { mpesaConsumerKey: values.mpesaConsumerKey } : {}),
        ...(values.mpesaConsumerSecret ? { mpesaConsumerSecret: values.mpesaConsumerSecret } : {}),
        ...(values.mpesaPasskey ? { mpesaPasskey: values.mpesaPasskey } : {}),
      } as any);
      queryClient.invalidateQueries();
      toast({ title: "M-Pesa credentials saved", description: "Daraja API configured successfully." });
      mpesaForm.setValue("mpesaConsumerKey", "");
      mpesaForm.setValue("mpesaConsumerSecret", "");
      mpesaForm.setValue("mpesaPasskey", "");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingMpesa(false);
    }
  };

  const onPesapalSubmit = async (values: PesapalForm) => {
    setSavingPesapal(true);
    try {
      await adminUpdateConfig({
        pesapalCallbackUrl: values.pesapalCallbackUrl,
        pesapalIpnUrl: values.pesapalIpnUrl,
        pesapalEnvironment: values.pesapalEnvironment,
        ...(values.pesapalConsumerKey ? { pesapalConsumerKey: values.pesapalConsumerKey } : {}),
        ...(values.pesapalConsumerSecret ? { pesapalConsumerSecret: values.pesapalConsumerSecret } : {}),
      } as any);
      queryClient.invalidateQueries();
      toast({ title: "Pesapal credentials saved", description: "Pesapal API v3 configured successfully." });
      pesapalForm.setValue("pesapalConsumerKey", "");
      pesapalForm.setValue("pesapalConsumerSecret", "");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingPesapal(false);
    }
  };

  const switchPaymentMethod = async (method: string) => {
    setSwitchingMethod(true);
    try {
      const token = localStorage.getItem("goalbet_token");
      const res = await fetch(`${API_BASE}/admin/payment/switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSelectedMethod(method);
      queryClient.invalidateQueries();
      toast({ title: "Payment method updated", description: `Now using: ${METHOD_OPTIONS.find(m => m.value === method)?.label}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSwitchingMethod(false);
    }
  };

  const registerIPN = async () => {
    setRegisteringIpn(true);
    try {
      const token = localStorage.getItem("goalbet_token");
      const res = await fetch(`${API_BASE}/admin/pesapal/register-ipn`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      queryClient.invalidateQueries();
      toast({ title: "IPN Registered", description: `Pesapal IPN ID: ${data.ipnId}` });
    } catch (err: any) {
      toast({ title: "IPN Registration Failed", description: err.message, variant: "destructive" });
    } finally {
      setRegisteringIpn(false);
    }
  };

  const fields = [
    { key: "minDeposit", label: "Minimum Deposit (KSh)", desc: "Minimum amount users can deposit" },
    { key: "minBet", label: "Minimum Bet (KSh)", desc: "Minimum stake per bet slip" },
    { key: "maxBetAmount", label: "Maximum Bet (KSh)", desc: "Maximum stake per bet slip" },
    { key: "minWithdrawal", label: "Minimum Withdrawal (KSh)", desc: "Minimum withdrawal amount" },
    { key: "withdrawalFeePercent", label: "Withdrawal Fee (%)", desc: "Platform fee on withdrawals" },
    { key: "consolationRefundPercent", label: "Consolation Refund (%)", desc: "Percentage of stake refunded when a slip loses (e.g. 50 = 50% back)" },
    { key: "referralRewardAmount", label: "Referral Reward (KSh)", desc: "Bonus credited to a user when their referral makes their first deposit" },
    { key: "bettingWindowMinutes", label: "Betting Window (minutes)", desc: "How long betting is open before a match starts" },
    { key: "matchDurationSeconds", label: "Match Duration (seconds)", desc: "Real-time seconds a simulated 90-minute match takes" },
  ];

  const mpesaConfigured = (data as any)?.mpesaConfigured;
  const keySet = (data as any)?.mpesaConsumerKeySet;
  const secretSet = (data as any)?.mpesaConsumerSecretSet;
  const passkeySet = (data as any)?.mpesaPasskeySet;
  const pesapalConfigured = (data as any)?.pesapalConfigured;
  const ppKeySet = (data as any)?.pesapalConsumerKeySet;
  const ppSecretSet = (data as any)?.pesapalConsumerSecretSet;
  const pesapalIpnId = (data as any)?.pesapalIpnId;

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="text-primary" /> Platform Configuration
        </h1>
        <p className="text-muted-foreground mt-1">Configure betting limits, platform settings, and payment gateways</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Platform settings */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-white">Settings</CardTitle>
            <CardDescription>Changes take effect immediately for new actions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-muted-foreground py-8 text-center">Loading config...</div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {fields.map((f) => (
                  <div key={f.key} className="space-y-2">
                    <Label className="text-white">{f.label}</Label>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                    <Input
                      type="number"
                      step="any"
                      {...register(f.key as keyof ConfigForm)}
                      className="bg-background border-border/50 text-white"
                    />
                  </div>
                ))}
                <Button type="submit" disabled={isSubmitting} className="w-full bg-primary text-black font-bold">
                  {isSubmitting ? "Saving..." : "Save Configuration"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* ── Active Payment Method ── */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" /> Active Payment Gateway
                </CardTitle>
                <CardDescription>Choose which gateway handles deposits. Switch any time.</CardDescription>
              </div>
              <Badge className={
                selectedMethod === "auto" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                selectedMethod === "daraja" ? "bg-primary/20 text-primary border-primary/30" :
                "bg-blue-500/20 text-blue-400 border-blue-500/30"
              }>
                {METHOD_OPTIONS.find(m => m.value === selectedMethod)?.label ?? selectedMethod}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {METHOD_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = selectedMethod === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => !isActive && switchPaymentMethod(opt.value)}
                  disabled={switchingMethod}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isActive
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/40 bg-background/50 hover:border-border hover:bg-background/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${opt.color}`} />
                      <div>
                        <p className="font-semibold text-white text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                    {isActive && (
                      <Badge className="bg-primary text-black text-xs font-bold shrink-0">Active</Badge>
                    )}
                  </div>
                </button>
              );
            })}
            <p className="text-xs text-muted-foreground pt-1 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Switching takes effect immediately. Ensure the selected gateway is fully configured below.
            </p>
          </CardContent>
        </Card>

        {/* M-Pesa Daraja credentials */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" /> M-Pesa Daraja API
                </CardTitle>
                <CardDescription>Safaricom Daraja credentials for STK push deposits</CardDescription>
              </div>
              {mpesaConfigured ? (
                <Badge className="bg-green-600 text-white flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">Not Configured</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={mpesaForm.handleSubmit(onMpesaSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Environment</Label>
                  <select
                    {...mpesaForm.register("mpesaEnvironment")}
                    className="w-full h-9 rounded-md border border-border/50 bg-background px-3 text-sm text-white"
                  >
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="production">Production (Live)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Business Short Code</Label>
                  <Input
                    placeholder="e.g. 174379"
                    {...mpesaForm.register("mpesaShortCode")}
                    className="bg-background border-border/50 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Callback URL</Label>
                <p className="text-xs text-muted-foreground">Safaricom will POST payment results here</p>
                <Input
                  placeholder="https://yourdomain.com/api/user/deposit/mpesa/callback"
                  {...mpesaForm.register("mpesaCallbackUrl")}
                  className="bg-background border-border/50 text-white font-mono text-xs"
                />
              </div>

              <div className="border-t border-border/30 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-white font-medium">Credentials</p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowMpesaSecrets(s => !s)} className="text-xs text-muted-foreground gap-1">
                    {showMpesaSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showMpesaSecrets ? "Hide" : "Show"} secrets
                  </Button>
                </div>
                <div className="space-y-3 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${keySet ? "bg-green-500" : "bg-zinc-600"}`} />
                    Consumer Key: {keySet ? "Set ✓" : "Not set"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${secretSet ? "bg-green-500" : "bg-zinc-600"}`} />
                    Consumer Secret: {secretSet ? "Set ✓" : "Not set"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${passkeySet ? "bg-green-500" : "bg-zinc-600"}`} />
                    Passkey: {passkeySet ? "Set ✓" : "Not set"}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Consumer Key {keySet && "(leave blank to keep current)"}</Label>
                    <Input
                      type={showMpesaSecrets ? "text" : "password"}
                      placeholder={keySet ? "••••••••" : "Enter consumer key"}
                      {...mpesaForm.register("mpesaConsumerKey")}
                      className="bg-background border-border/50 text-white font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Consumer Secret {secretSet && "(leave blank to keep current)"}</Label>
                    <Input
                      type={showMpesaSecrets ? "text" : "password"}
                      placeholder={secretSet ? "••••••••" : "Enter consumer secret"}
                      {...mpesaForm.register("mpesaConsumerSecret")}
                      className="bg-background border-border/50 text-white font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Passkey {passkeySet && "(leave blank to keep current)"}</Label>
                    <Input
                      type={showMpesaSecrets ? "text" : "password"}
                      placeholder={passkeySet ? "••••••••" : "Enter passkey"}
                      {...mpesaForm.register("mpesaPasskey")}
                      className="bg-background border-border/50 text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={savingMpesa} className="w-full font-bold">
                {savingMpesa ? "Saving..." : "Save M-Pesa Credentials"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Pesapal API v3 credentials ── */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-400" /> Pesapal API v3
                </CardTitle>
                <CardDescription>Pesapal payment page — works with cards, mobile money &amp; more</CardDescription>
              </div>
              {pesapalConfigured ? (
                <Badge className="bg-blue-600 text-white flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">Not Configured</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={pesapalForm.handleSubmit(onPesapalSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-white">Environment</Label>
                <select
                  {...pesapalForm.register("pesapalEnvironment")}
                  className="w-full h-9 rounded-md border border-border/50 bg-background px-3 text-sm text-white"
                >
                  <option value="sandbox">Sandbox (Testing)</option>
                  <option value="live">Live (Production)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Callback URL</Label>
                <p className="text-xs text-muted-foreground">Where users land after completing Pesapal payment (your app URL)</p>
                <Input
                  placeholder="https://yourdomain.com/transactions"
                  {...pesapalForm.register("pesapalCallbackUrl")}
                  className="bg-background border-border/50 text-white font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">IPN URL</Label>
                <p className="text-xs text-muted-foreground">Pesapal posts payment confirmations here (your backend API)</p>
                <Input
                  placeholder="https://yourdomain.com/api/user/deposit/pesapal/ipn"
                  {...pesapalForm.register("pesapalIpnUrl")}
                  className="bg-background border-border/50 text-white font-mono text-xs"
                />
              </div>

              <div className="border-t border-border/30 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-white font-medium">API Credentials</p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowPesapalSecrets(s => !s)} className="text-xs text-muted-foreground gap-1">
                    {showPesapalSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showPesapalSecrets ? "Hide" : "Show"} secrets
                  </Button>
                </div>
                <div className="space-y-3 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${ppKeySet ? "bg-green-500" : "bg-zinc-600"}`} />
                    Consumer Key: {ppKeySet ? "Set ✓" : "Not set"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${ppSecretSet ? "bg-green-500" : "bg-zinc-600"}`} />
                    Consumer Secret: {ppSecretSet ? "Set ✓" : "Not set"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${!!pesapalIpnId ? "bg-green-500" : "bg-zinc-600"}`} />
                    IPN Registered: {pesapalIpnId ? `✓ (ID: ${pesapalIpnId.slice(0, 8)}…)` : "Not registered"}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Consumer Key {ppKeySet && "(leave blank to keep current)"}</Label>
                    <Input
                      type={showPesapalSecrets ? "text" : "password"}
                      placeholder={ppKeySet ? "••••••••" : "Enter Pesapal consumer key"}
                      {...pesapalForm.register("pesapalConsumerKey")}
                      className="bg-background border-border/50 text-white font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Consumer Secret {ppSecretSet && "(leave blank to keep current)"}</Label>
                    <Input
                      type={showPesapalSecrets ? "text" : "password"}
                      placeholder={ppSecretSet ? "••••••••" : "Enter Pesapal consumer secret"}
                      {...pesapalForm.register("pesapalConsumerSecret")}
                      className="bg-background border-border/50 text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={savingPesapal} className="flex-1 font-bold bg-blue-600 hover:bg-blue-700 text-white">
                  {savingPesapal ? "Saving..." : "Save Pesapal Credentials"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={registeringIpn || !pesapalConfigured}
                  onClick={registerIPN}
                  className="gap-2 border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
                  title={!pesapalConfigured ? "Configure Pesapal credentials first" : "Register IPN URL with Pesapal"}
                >
                  <RefreshCw className={`w-4 h-4 ${registeringIpn ? "animate-spin" : ""}`} />
                  {registeringIpn ? "Registering…" : "Register IPN"}
                </Button>
              </div>

              {pesapalConfigured && !pesapalIpnId && (
                <div className="flex items-start gap-2 text-xs text-yellow-400 bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  IPN not registered yet. Click "Register IPN" after saving credentials to enable automatic payment confirmations.
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
