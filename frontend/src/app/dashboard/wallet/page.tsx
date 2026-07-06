"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function WalletPage() {
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadWallet() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      const userId = data.session.user.id;

      // Fetch the wallet address for this user through our backend
      const walletRes = await fetch(`http://localhost:4000/wallet/for-user/${userId}`);

      if (!walletRes.ok) {
        setError("No wallet found for this account.");
        setLoading(false);
        return;
      }

      const walletJson = await walletRes.json();
      setAddress(walletJson.address);

      // Fetch the real balance from our backend
      const res = await fetch(`http://localhost:4000/wallet/${walletJson.address}/balance`);
      if (res.ok) {
        const json = await res.json();
        setBalance(json.balance);
      }

      setLoading(false);
    }

    loadWallet();
  }, [router]);

  if (loading) {
    return <p className="text-neutral-400">Loading wallet...</p>;
  }

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold">Wallet</h2>

      <div className="max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="mb-1 text-sm text-neutral-400">Address</p>
        <p className="mb-4 break-all font-mono text-sm text-white">{address}</p>

        <p className="mb-1 text-sm text-neutral-400">Balance</p>
        <p className="text-2xl font-semibold text-white">{balance} OKB</p>
      </div>
    </div>
  );
}