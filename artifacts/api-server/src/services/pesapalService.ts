import axios from "axios";

export interface PesapalCredentials {
  consumerKey: string;
  consumerSecret: string;
  environment: "sandbox" | "live";
}

function baseUrl(env: "sandbox" | "live") {
  return env === "live"
    ? "https://pay.pesapal.com/v3"
    : "https://cybqa.pesapal.com/pesapalv3";
}

export async function getPesapalToken(creds: PesapalCredentials): Promise<string> {
  const res = await axios.post(
    `${baseUrl(creds.environment)}/api/Auth/RequestToken`,
    { consumer_key: creds.consumerKey, consumer_secret: creds.consumerSecret },
    { headers: { Accept: "application/json", "Content-Type": "application/json" } }
  );
  if (!res.data.token) throw new Error("Pesapal auth failed: no token returned");
  return res.data.token;
}

export async function registerPesapalIPN(
  creds: PesapalCredentials,
  ipnUrl: string
): Promise<string> {
  const token = await getPesapalToken(creds);
  const res = await axios.post(
    `${baseUrl(creds.environment)}/api/URLSetup/RegisterIPN`,
    { url: ipnUrl, ipn_notification_type: "POST" },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );
  const ipnId = res.data.ipn_id;
  if (!ipnId) throw new Error("Pesapal IPN registration failed: no ipn_id returned");
  return ipnId;
}

export interface PesapalOrderParams {
  merchantReference: string;
  amount: number;
  currency?: string;
  description: string;
  callbackUrl: string;
  ipnId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}

export interface PesapalOrderResult {
  orderTrackingId: string;
  merchantReference: string;
  redirectUrl: string;
}

export async function submitPesapalOrder(
  creds: PesapalCredentials,
  params: PesapalOrderParams
): Promise<PesapalOrderResult> {
  const token = await getPesapalToken(creds);
  const orderBody: Record<string, unknown> = {
    id: params.merchantReference,
    currency: params.currency ?? "KES",
    amount: Math.round(params.amount),
    description: params.description,
    callback_url: params.callbackUrl,
    notification_id: params.ipnId,
    billing_address: {
      email_address: params.email || "user@goalbet.app",
      phone_number: params.phone || "",
      country_code: "KE",
      first_name: params.firstName || "GoalBet",
      last_name: params.lastName || "User",
    },
  };

  const res = await axios.post(
    `${baseUrl(creds.environment)}/api/Transactions/SubmitOrderRequest`,
    orderBody,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  const { order_tracking_id, merchant_reference, redirect_url } = res.data;
  if (!order_tracking_id || !redirect_url) {
    throw new Error(res.data.error?.message || "Pesapal order submission failed");
  }

  return {
    orderTrackingId: order_tracking_id,
    merchantReference: merchant_reference,
    redirectUrl: redirect_url,
  };
}

export type PesapalPaymentStatus = "COMPLETED" | "PENDING" | "FAILED" | "INVALID" | "REVERSED";

export interface PesapalStatusResult {
  status: PesapalPaymentStatus;
  amount?: number;
  confirmationCode?: string;
  description?: string;
}

export async function getPesapalOrderStatus(
  creds: PesapalCredentials,
  orderTrackingId: string
): Promise<PesapalStatusResult> {
  const token = await getPesapalToken(creds);
  const res = await axios.get(
    `${baseUrl(creds.environment)}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );
  return {
    status: (res.data.payment_status_description?.toUpperCase() ?? "PENDING") as PesapalPaymentStatus,
    amount: res.data.amount,
    confirmationCode: res.data.confirmation_code,
    description: res.data.description,
  };
}
