"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
    const res = await fetch(`http://localhost:4000/addresses/${uid}`);
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

    const res = await fetch("http://localhost:4000/addresses", {
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
    return <p className="text-neutral-400">Loading addresses...</p>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Addresses</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200"
        >
          {showForm ? "Cancel" : "Add address"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="mb-8 max-w-md space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-6"
        >
          <input
            placeholder="Label (e.g. Home, Office, Mum)"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
          />
          <input
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
          />
          <input
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
          />
          <input
            placeholder="Street"
            required
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
          />
          <div className="flex gap-3">
            <input
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
            />
            <input
              placeholder="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
            />
          </div>
          <div className="flex gap-3">
            <input
              placeholder="Postal code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
            />
            <input
              placeholder="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-white py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save address"}
          </button>
        </form>
      )}

      {addresses.length === 0 ? (
        <p className="text-neutral-500">No addresses saved yet.</p>
      ) : (
        <div className="grid max-w-2xl gap-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
            >
              <p className="mb-1 text-sm font-medium text-white">{addr.label}</p>
              <p className="text-sm text-neutral-400">
                {addr.full_name} · {addr.phone}
              </p>
              <p className="text-sm text-neutral-400">
                {addr.street}, {addr.city}, {addr.state}, {addr.postal_code}, {addr.country}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}