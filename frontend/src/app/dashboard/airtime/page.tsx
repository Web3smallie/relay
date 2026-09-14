"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/api";

type Operator = {
  name: string;
  minAmount: number;
  maxAmount: number;
  destinationCurrencyCode: string;
};

export default function AirtimePage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("NG");
  const [operator, setOperator] = useState<Operator | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function checkNetwork(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setOperator(null);

    try {
      const response = await fetch(`${API_URL}/reloadly/operator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim(), countryCode: countryCode.trim().toUpperCase() }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not identify the mobile network.");
      setOperator(body.operator);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not identify the mobile network.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Back link & Header */}
      <div>
        <Link href="/dashboard/services" className="text-xs text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1 mb-3">
          <span>← Back to Services</span>
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-300">
            Reloadly Service
          </span>
          <span className="rounded-full bg-white/[0.05] border border-white/10 px-3 py-1 text-xs text-neutral-400">
            Direct Treasury Rail
          </span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Mobile Airtime Top-Up
        </h2>
        <p className="mt-2 text-sm sm:text-base leading-relaxed text-neutral-300">
          Enter any international phone number. Relay detects the carrier, queries top-up denominations,
          and prepares instant settlement via your Arc USDC wallet.
        </p>
      </div>

      {/* Network Lookup Form */}
      <form
        onSubmit={checkNetwork}
        className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-[#1C1408]/90 via-[#15111b]/90 to-neutral-950 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-5"
      >
        <div>
          <label className="text-xs font-medium text-neutral-300 mb-1.5 block">
            Mobile Number
          </label>
          <input
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            placeholder="e.g. 2348012345678"
            required
            className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-3 text-sm text-white font-mono outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-300 mb-1.5 block">
            Country Code (ISO 2-letter)
          </label>
          <input
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
            maxLength={2}
            required
            className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-3 text-sm uppercase font-mono text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <button
          disabled={loading}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm hover:brightness-110 disabled:opacity-50 transition shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Identifying Network...</span>
            </>
          ) : (
            <span>Check Mobile Network</span>
          )}
        </button>
      </form>

      {/* Error Message */}
      {message && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm text-rose-300">
          ✕ {message}
        </div>
      )}

      {/* Detected Operator Card */}
      {operator && (
        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-neutral-900/80 to-neutral-950 p-6 sm:p-7 backdrop-blur-xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Detected Mobile Network
            </span>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs text-emerald-300 font-semibold">
              Live Verified
            </span>
          </div>

          <h3 className="text-2xl font-bold text-white tracking-tight">{operator.name}</h3>

          <p className="text-xs sm:text-sm text-neutral-300">
            Supported top-up range: <strong className="text-white">{operator.minAmount}–{operator.maxAmount} {operator.destinationCurrencyCode}</strong>.
          </p>

          <div className="mt-4 pt-4 border-t border-white/[0.08] text-xs text-neutral-400 leading-relaxed bg-white/[0.02] p-3 rounded-xl">
            ⚡ Ready for direct Arc USDC execution via Reloadly ACP adapter.
          </div>
        </div>
      )}
    </div>
  );
}

