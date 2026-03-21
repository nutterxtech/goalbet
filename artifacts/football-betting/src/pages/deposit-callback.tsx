import { useEffect } from "react";

export default function DepositCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderTrackingId = params.get("OrderTrackingId") || params.get("orderTrackingId") || "";
    const merchantRef = params.get("OrderMerchantReference") || params.get("orderMerchantReference") || "";

    const msg = { type: "pesapal-callback", orderTrackingId, merchantRef };

    // Opened as a popup — tell the opener
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(msg, window.location.origin);
      } catch {}
      // Give the parent a moment to react, then close
      setTimeout(() => { try { window.close(); } catch {} }, 1200);
      return;
    }

    // Opened inside an iframe — tell the parent frame
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage(msg, window.location.origin);
      } catch {}
      return;
    }

    // Full-page navigation fallback — redirect back to transactions
    window.location.replace("/?deposit=success&ref=" + encodeURIComponent(orderTrackingId));
  }, []);

  return (
    <div className="min-h-screen bg-card flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="w-12 h-12 rounded-full border-2 border-green-400/40 border-t-green-400 animate-spin" />
      <div>
        <p className="text-sm font-semibold text-white">Payment received — processing…</p>
        <p className="text-xs text-muted-foreground mt-1">This window will close automatically.</p>
      </div>
    </div>
  );
}
