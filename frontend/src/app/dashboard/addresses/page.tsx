"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";

type Address = {
  id: number;
  label: string;
  full_name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

export default function AddressesPage() {
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [label, setLabel] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  const router = useRouter();

  async function loadAddresses(uid: string) {
    const res = await fetch(`${API_URL}/addresses/${uid}`);
    if (res.ok) {
      const json = await res.json();
      setAddresses(json.addresses ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }
      const uid = data.session.user.id;
      setUserId(uid);
      loadAddresses(uid);
    }
    init();
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);

    const res = await fetch(`${API_URL}/addresses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        label,
        fullName,
        phone,
        street,
        city,
        state,
        postalCode,
        country,
      }),
    });

    if (res.ok) {
      setLabel("");
      setFullName("");
      setPhone("");
      setStreet("");
      setCity("");
      setState("");
      setPostalCode("");
      setCountry("");
      setShowForm(false);
      loadAddresses(userId);
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span className="text-sm">Loading delivery profiles...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-semibold text-cyan-300">
              Buyer Identity
            </span>
            <span className="rounded-full bg-white/[0.05] border border-white/10 px-3 py-1 text-xs text-neutral-400">
              Auto-Shipping Profiles
            </span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Delivery Addresses
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-400">
            Save shipping locations so your AI shopping agent can automatically quote shipping rates and
            complete merchant checkouts.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className={`h-11 px-5 rounded-xl font-semibold text-sm transition shadow-lg flex items-center justify-center gap-2 ${
            showForm
              ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/20 hover:brightness-110"
          }`}
        >
          {showForm ? (
            "Cancel"
          ) : (
            <>
              <span>+ Add Address</span>
            </>
          )}
        </button>
      </div>

      {/* Address Form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-[#0c1322]/90 via-[#0e1728]/90 to-neutral-950 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-5"
        >
          <div className="border-b border-white/[0.08] pb-3">
            <h3 className="text-lg font-bold text-white">Add Delivery Profile</h3>
            <p className="text-xs text-neutral-400">Enter physical shipping destination details</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-neutral-300 mb-1 block">
                Label <span className="text-neutral-500">(e.g. Home, Office, Mum)</span>
              </label>
              <input
                placeholder="Home"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300 mb-1 block">Full Name</label>
              <input
                placeholder="John Doe"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-300 mb-1 block">Phone Number</label>
            <input
              placeholder="+1 (555) 000-0000"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-300 mb-1 block">Street Address</label>
            <input
              placeholder="123 Market Street, Suite 400"
              required
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-neutral-300 mb-1 block">City</label>
              <input
                placeholder="San Francisco"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-300 mb-1 block">State / Region</label>
              <input
                placeholder="CA"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-300 mb-1 block">Postal Code</label>
              <input
                placeholder="94105"
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-300 mb-1 block">Country</label>
              <input
                placeholder="US"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold text-sm text-white hover:brightness-110 disabled:opacity-50 transition shadow-lg shadow-cyan-500/20"
            >
              {saving ? "Saving..." : "Save Delivery Address"}
            </button>
          </div>
        </form>
      )}

      {/* Saved Addresses List */}
      {addresses.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.08] bg-neutral-900/40 p-10 text-center text-neutral-400">
          <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto mb-3 text-xl">
            📍
          </div>
          <p className="font-semibold text-white">No delivery addresses saved yet</p>
          <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
            Click "+ Add Address" above or tell the Relay agent your address during a shopping conversation.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1220] via-neutral-900/80 to-neutral-950 p-5 backdrop-blur-md transition hover:border-cyan-500/30"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-0.5 text-xs font-bold text-cyan-300">
                  {addr.label}
                </span>
                <span className="text-xs text-neutral-400 font-mono">#{addr.id}</span>
              </div>

              <p className="font-bold text-white text-base">{addr.full_name}</p>
              <p className="text-xs text-neutral-400 mt-0.5">{addr.phone}</p>

              <div className="mt-3 pt-3 border-t border-white/[0.06] text-xs text-neutral-300 leading-relaxed">
                <p>{addr.street}</p>
                <p>
                  {addr.city}, {addr.state} {addr.postal_code}
                </p>
                <p className="font-semibold text-neutral-200 mt-1 uppercase tracking-wider text-[11px]">
                  {addr.country}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

