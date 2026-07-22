// backend/src/merchants/ReloadlyAdapter.ts
//
// Raw Reloadly API client — token fetching, operator auto-detection,
// and sending an airtime top-up. Not wired into ACP or any route yet.
// One client_id/secret pair works across Reloadly products; the
// "audience" value in the token request determines which product
// the token is valid for.

import dotenv from "dotenv";
dotenv.config();

const CLIENT_ID = process.env.RELOADLY_CLIENT_ID as string;
const CLIENT_SECRET = process.env.RELOADLY_CLIENT_SECRET as string;
const IS_SANDBOX = process.env.RELOADLY_SANDBOX !== "false"; // defaults to sandbox unless explicitly "false"

const AUTH_URL = "https://auth.reloadly.com/oauth/token";
const TOPUPS_BASE = IS_SANDBOX
  ? "https://topups-sandbox.reloadly.com"
  : "https://topups.reloadly.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials",
      audience: TOPUPS_BASE,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Reloadly auth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  // Test tokens last 24h, production tokens last 60 days — cache with a safety margin
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

export type ReloadlyOperator = {
  operatorId: number;
  name: string;
  minAmount: number;
  maxAmount: number;
  destinationCurrencyCode: string;
};

export async function detectOperator(
  phoneNumber: string,
  countryIsoCode: string
): Promise<ReloadlyOperator> {
  const token = await getAccessToken();

  const res = await fetch(
    `${TOPUPS_BASE}/operators/auto-detect/phone/${phoneNumber}/countries/${countryIsoCode}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/com.reloadly.topups-v1+json",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Reloadly operator auto-detect failed: ${res.status} ${text}`);
  }

  return res.json();
}

export type TopupResult = {
  transactionId: number;
  status: string;
  amount: number;
};

export async function sendTopup(
  operatorId: number,
  amount: number,
  countryIsoCode: string,
  phoneNumber: string
): Promise<TopupResult> {
  const token = await getAccessToken();

  const res = await fetch(`${TOPUPS_BASE}/topups`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/com.reloadly.topups-v1+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operatorId,
      amount,
      recipientPhone: {
        countryCode: countryIsoCode,
        number: phoneNumber,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Reloadly topup failed: ${res.status} ${text}`);
  }

  return res.json();
}