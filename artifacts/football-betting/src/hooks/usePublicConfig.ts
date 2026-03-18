import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";

export interface PublicConfig {
  minDeposit: number;
  minBet: number;
  minWithdrawal: number;
  withdrawalFeePercent: number;
  maxBetAmount: number;
  minSpinAmount: number;
  maxSpinAmount: number;
  referralRewardAmount: number;
}

const DEFAULTS: PublicConfig = {
  minDeposit: 20,
  minBet: 5,
  minWithdrawal: 50,
  withdrawalFeePercent: 12,
  maxBetAmount: 10000,
  minSpinAmount: 10,
  maxSpinAmount: 50000,
  referralRewardAmount: 50,
};

export function usePublicConfig() {
  const { data } = useQuery<PublicConfig>({
    queryKey: ["/api/public/config"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/public/config`);
      if (!res.ok) return DEFAULTS;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  return data ?? DEFAULTS;
}
