"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/api";

type FlightOffer = {
  id: string;
  amount: string;
  currency: string;
  carrier: string;
  departureAt: string | null;
  arrivalAt: string | null;
  stops: number;
};

export default function TravelPage() {
  const [origin, setOrigin] = useState("LOS");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function searchFlights(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setOffers([]);
    try {
      const response = await fetch(`${API_URL}/travel/flights/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination, departureDate, returnDate: returnDate || undefined, adults }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Flight search failed.");
      setOffers(body.offers ?? []);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Flight search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Back Link & Header */}
      <div>
        <Link href="/dashboard/services" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 mb-3">
          <span>← Back to Services</span>
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-semibold text-cyan-300">
            Duffel Flights
          </span>
          <span className="rounded-full bg-white/[0.05] border border-white/10 px-3 py-1 text-xs text-neutral-400">
            300+ Airlines
          </span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Search Flights
        </h2>
        <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-neutral-300">
          Compare real-time flight offers, routes, and carriers across worldwide networks.
        </p>
      </div>

      {/* Flight Search Form */}
      <form
        onSubmit={searchFlights}
        className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-[#081822]/90 via-[#0a121e]/90 to-neutral-950 p-6 sm:p-8 backdrop-blur-xl shadow-2xl grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div>
          <label className="text-xs font-medium text-neutral-300 mb-1.5 block">From (IATA)</label>
          <input
            value={origin}
            onChange={(event) => setOrigin(event.target.value.toUpperCase())}
            maxLength={3}
            placeholder="LOS"
            required
            className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-3.5 py-2.5 text-sm uppercase font-mono text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-300 mb-1.5 block">To (IATA)</label>
          <input
            value={destination}
            onChange={(event) => setDestination(event.target.value.toUpperCase())}
            maxLength={3}
            placeholder="LHR"
            required
            className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-3.5 py-2.5 text-sm uppercase font-mono text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-300 mb-1.5 block">Depart Date</label>
          <input
            type="date"
            value={departureDate}
            onChange={(event) => setDepartureDate(event.target.value)}
            required
            className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-300 mb-1.5 block">
            Return <span className="text-neutral-500">(opt)</span>
          </label>
          <input
            type="date"
            value={returnDate}
            onChange={(event) => setReturnDate(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-neutral-300 mb-1.5 block">Adults</label>
          <input
            type="number"
            min="1"
            max="9"
            value={adults}
            onChange={(event) => setAdults(Number(event.target.value))}
            className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <button
          disabled={loading}
          className="sm:col-span-2 lg:col-span-5 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-sm text-white hover:brightness-110 disabled:opacity-50 transition shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Searching Flight Offers...</span>
            </>
          ) : (
            <span>Search Flights</span>
          )}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm text-rose-300">
          ✕ {error}
        </div>
      )}

      {/* Results List */}
      {offers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Available Offers ({offers.length})</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {offers.map((offer) => (
              <article
                key={offer.id}
                className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1322] via-neutral-900/80 to-neutral-950 p-5 backdrop-blur-md transition hover:border-cyan-500/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-base font-bold text-white">{offer.carrier}</span>
                  <span className="text-xl font-extrabold text-cyan-300">
                    {offer.amount} <span className="text-xs font-semibold">{offer.currency}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                      offer.stops === 0
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {offer.stops === 0 ? "Non-stop" : `${offer.stops} stop${offer.stops === 1 ? "" : "s"}`}
                  </span>
                </div>

                <div className="text-xs text-neutral-400 space-y-1 pt-3 border-t border-white/[0.06]">
                  <p>
                    Departs: <span className="text-neutral-200">{offer.departureAt ? new Date(offer.departureAt).toLocaleString() : "—"}</span>
                  </p>
                  <p>
                    Arrives: <span className="text-neutral-200">{offer.arrivalAt ? new Date(offer.arrivalAt).toLocaleString() : "—"}</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && offers.length === 0 && (
        <div className="rounded-3xl border border-white/[0.08] bg-neutral-900/30 p-8 text-center text-sm text-neutral-500">
          Enter an origin and destination airport code (e.g. LOS → LHR) to search live flight routes.
        </div>
      )}
    </div>
  );
}

