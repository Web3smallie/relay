"use client";

import { FormEvent, useState } from "react";
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
    <div className="mx-auto max-w-xl">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">Reloadly service</p>
      <h2 className="mt-3 text-3xl font-semibold text-white">Mobile airtime</h2>
      <p className="mt-3 text-sm leading-6 text-neutral-400">
        Enter a number and Relay will identify the supported mobile network before a top-up is created.
      </p>

      <form onSubmit={checkNetwork} className="mt-8 space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
        <label className="block text-sm text-neutral-300">
          Mobile number
          <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="e.g. 2348012345678" required className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white outline-none focus:border-neutral-500" />
        </label>
        <label className="block text-sm text-neutral-300">
          Country code
          <input value={countryCode} onChange={(event) => setCountryCode(event.target.value)} maxLength={2} required className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 uppercase text-white outline-none focus:border-neutral-500" />
        </label>
        <button disabled={loading} className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black disabled:opacity-50">
          {loading ? "Checking network..." : "Check mobile network"}
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-red-400">{message}</p>}
      {operator && (
        <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
          <p className="text-sm text-neutral-500">Mobile network</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{operator.name}</h3>
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            Top-up range: {operator.minAmount}–{operator.maxAmount} {operator.destinationCurrencyCode}.
          </p>
          <p className="mt-4 text-sm leading-6 text-amber-300">
            Airtime delivery is connected in the backend. The final USDC payment and delivery confirmation screen will be added before this is enabled for live customer top-ups.
          </p>
        </div>
      )}
    </div>
  );
}
