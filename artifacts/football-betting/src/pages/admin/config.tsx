import { useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAdminGetConfig, adminUpdateConfig } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";

interface ConfigForm {
  minDeposit: number;
  minBet: number;
  minWithdrawal: number;
  withdrawalFeePercent: number;
  bettingWindowMinutes: number;
  matchDurationSeconds: number;
  maxBetAmount: number;
}

export default function AdminConfig() {
  const { data, isLoading } = useAdminGetConfig();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ConfigForm>();

  useEffect(() => {
    if (data) reset(data);
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
      });
      queryClient.invalidateQueries();
      toast({ title: "Config updated", description: "Platform configuration saved." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const fields = [
    { key: "minDeposit", label: "Minimum Deposit (KSh)", desc: "Minimum amount users can deposit" },
    { key: "minBet", label: "Minimum Bet (KSh)", desc: "Minimum amount users can bet" },
    { key: "maxBetAmount", label: "Maximum Bet (KSh)", desc: "Maximum amount per single bet" },
    { key: "minWithdrawal", label: "Minimum Withdrawal (KSh)", desc: "Minimum withdrawal amount" },
    { key: "withdrawalFeePercent", label: "Withdrawal Fee (%)", desc: "Platform fee on withdrawals" },
    { key: "bettingWindowMinutes", label: "Betting Window (minutes)", desc: "How long betting is open before a match" },
    { key: "matchDurationSeconds", label: "Match Duration (seconds)", desc: "How many real seconds a 90-minute match takes" },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="text-primary" /> Platform Configuration
        </h1>
        <p className="text-muted-foreground mt-1">Configure betting limits and platform settings</p>
      </div>

      <Card className="bg-card/50 border-border/50 max-w-2xl">
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
    </AdminLayout>
  );
}
