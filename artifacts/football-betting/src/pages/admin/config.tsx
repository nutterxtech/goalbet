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
import { Settings, Smartphone, CheckCircle2, Eye, EyeOff } from "lucide-react";

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

export default function AdminConfig() {
  const { data, isLoading } = useAdminGetConfig();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ConfigForm>();
  const mpesaForm = useForm<MpesaForm>({ defaultValues: { mpesaEnvironment: "sandbox" } });
  const [showSecrets, setShowSecrets] = useState(false);
  const [savingMpesa, setSavingMpesa] = useState(false);

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

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="text-primary" /> Platform Configuration
        </h1>
        <p className="text-muted-foreground mt-1">Configure betting limits and platform settings</p>
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

        {/* M-Pesa Daraja credentials */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" /> M-Pesa Daraja API
                </CardTitle>
                <CardDescription>Configure Safaricom Daraja credentials for real M-Pesa payments</CardDescription>
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
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowSecrets(s => !s)} className="text-xs text-muted-foreground gap-1">
                    {showSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showSecrets ? "Hide" : "Show"} secrets
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
                      type={showSecrets ? "text" : "password"}
                      placeholder={keySet ? "••••••••" : "Enter consumer key"}
                      {...mpesaForm.register("mpesaConsumerKey")}
                      className="bg-background border-border/50 text-white font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Consumer Secret {secretSet && "(leave blank to keep current)"}</Label>
                    <Input
                      type={showSecrets ? "text" : "password"}
                      placeholder={secretSet ? "••••••••" : "Enter consumer secret"}
                      {...mpesaForm.register("mpesaConsumerSecret")}
                      className="bg-background border-border/50 text-white font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Passkey {passkeySet && "(leave blank to keep current)"}</Label>
                    <Input
                      type={showSecrets ? "text" : "password"}
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
      </div>
    </AdminLayout>
  );
}
