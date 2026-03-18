import axios from "axios";

export interface MpesaCredentials {
  consumerKey: string;
  consumerSecret: string;
  shortCode: string;
  passkey: string;
  callbackUrl: string;
  environment: "sandbox" | "production";
}

function baseUrl(env: "sandbox" | "production") {
  return env === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

async function getAccessToken(creds: MpesaCredentials): Promise<string> {
  const auth = Buffer.from(`${creds.consumerKey}:${creds.consumerSecret}`).toString("base64");
  const res = await axios.get(
    `${baseUrl(creds.environment)}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  return res.data.access_token;
}

function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

export interface StkPushResult {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export async function initiateSTKPush(
  creds: MpesaCredentials,
  phoneNumber: string,
  amount: number,
  accountRef: string,
  description: string
): Promise<StkPushResult> {
  const token = await getAccessToken(creds);
  const ts = timestamp();
  const password = Buffer.from(
    `${creds.shortCode}${creds.passkey}${ts}`
  ).toString("base64");

  const phone = phoneNumber.replace(/^\+?254|^0/, "254").replace(/\D/g, "");

  const res = await axios.post(
    `${baseUrl(creds.environment)}/mpesa/stkpush/v1/processrequest`,
    {
      BusinessShortCode: creds.shortCode,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: creds.shortCode,
      PhoneNumber: phone,
      CallBackURL: creds.callbackUrl,
      AccountReference: accountRef,
      TransactionDesc: description,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return res.data;
}

export interface B2CResult {
  ConversationID: string;
  OriginatorConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

export interface STKQueryResult {
  ResponseCode: string;
  ResultCode: string;
  ResultDesc: string;
}

export async function querySTKPush(
  creds: MpesaCredentials,
  checkoutRequestId: string
): Promise<STKQueryResult> {
  const token = await getAccessToken(creds);
  const ts = timestamp();
  const password = Buffer.from(`${creds.shortCode}${creds.passkey}${ts}`).toString("base64");

  const res = await axios.post(
    `${baseUrl(creds.environment)}/mpesa/stkpushquery/v1/query`,
    {
      BusinessShortCode: creds.shortCode,
      Password: password,
      Timestamp: ts,
      CheckoutRequestID: checkoutRequestId,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

export async function initiateB2C(
  creds: MpesaCredentials,
  phoneNumber: string,
  amount: number,
  resultUrl: string,
  queueUrl: string,
  remarks: string
): Promise<B2CResult> {
  const token = await getAccessToken(creds);
  const phone = phoneNumber.replace(/^\+?254|^0/, "254").replace(/\D/g, "");

  const res = await axios.post(
    `${baseUrl(creds.environment)}/mpesa/b2c/v1/paymentrequest`,
    {
      InitiatorName: "testapi",
      SecurityCredential: creds.passkey,
      CommandID: "BusinessPayment",
      Amount: Math.round(amount),
      PartyA: creds.shortCode,
      PartyB: phone,
      Remarks: remarks,
      QueueTimeOutURL: queueUrl,
      ResultURL: resultUrl,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return res.data;
}
