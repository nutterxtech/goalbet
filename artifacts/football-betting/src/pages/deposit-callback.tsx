import { useEffect } from "react";

export default function DepositCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderTrackingId = params.get("OrderTrackingId") || params.get("orderTrackingId") || "";
    const merchantRef = params.get("OrderMerchantReference") || params.get("orderMerchantReference") || "";

    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: "pesapal-callback", orderTrackingId, merchantRef },
        window.location.origin
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-card flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="w-12 h-12 rounded-full border-2 border-green-400/40 border-t-green-400 animate-spin" />
      <div>
        <p className="text-sm font-semibold text-white">Processing your payment…</p>
        <p className="text-xs text-muted-foreground mt-1">Please wait, this window will close automatically.</p>
      </div>
    </div>
  );
}
