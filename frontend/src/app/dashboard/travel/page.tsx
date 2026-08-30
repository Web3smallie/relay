"use client";

import { FormEvent, useState } from "react";
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
    <div className="mx-auto max-w-5xl">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">Duffel travel</p>
      <h2 className="mt-3 text-3xl font-semibold text-white">Search flights</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
        Compare flight offers by route and date. Booking is deliberately not enabled from this screen yet.
      </p>

      <form onSubmit={searchFlights} className="mt-8 grid gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-5">
        <label className="text-sm text-neutral-300">From<input value={origin} onChange={(event) => setOrigin(event.target.value.toUpperCase())} maxLength={3} required className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 uppercase text-white outline-none focus:border-neutral-500" /></label>
        <label className="text-sm text-neutral-300">To<input value={destination} onChange={(event) => setDestination(event.target.value.toUpperCase())} maxLength={3} required className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 uppercase text-white outline-none focus:border-neutral-500" /></label>
        <label className="text-sm text-neutral-300">Depart<input type="date" value={departureDate} onChange={(event) => setDepartureDate(event.target.value)} required className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white outline-none focus:border-neutral-500" /></label>
        <label className="text-sm text-neutral-300">Return <span className="text-neutral-500">(optional)</span><input type="date" value={returnDate} onChange={(event) => setReturnDate(event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white outline-none focus:border-neutral-500" /></label>
        <label className="text-sm text-neutral-300">Adults<input type="number" min="1" max="9" value={adults} onChange={(event) => setAdults(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white outline-none focus:border-neutral-500" /></label>
        <button disabled={loading} className="sm:col-span-2 lg:col-span-5 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black disabled:opacity-50">{loading ? "Searching flights..." : "Search flights"}</button>
      </form>

      {error && <p className="mt-5 text-sm text-red-400">{error}</p>}
      {offers.length > 0 && <div className="mt-6 grid gap-4 md:grid-cols-2">{offers.map((offer) => <article key={offer.id} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"><p className="text-lg font-semibold text-white">{offer.carrier}</p><p className="mt-1 text-2xl font-semibold text-white">{offer.amount} {offer.currency}</p><p className="mt-3 text-sm text-neutral-400">{offer.stops === 0 ? "Non-stop" : `${offer.stops} stop${offer.stops === 1 ? "" : "s"}`}</p><p className="mt-2 text-xs text-neutral-500">Departs {offer.departureAt ? new Date(offer.departureAt).toLocaleString() : "—"}</p><p className="mt-1 text-xs text-neutral-500">Arrives {offer.arrivalAt ? new Date(offer.arrivalAt).toLocaleString() : "—"}</p></article>)}</div>}
      {!loading && !error && offers.length === 0 && <p className="mt-6 text-sm text-neutral-500">Enter a route to see available offers.</p>}
    </div>
  );
}
