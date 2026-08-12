"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type CctpWallet = {
  blockchain: string;
  address: string;
};

const CHAIN_LABELS: Record<string, string> = {
  "ETH-SEPOLIA": "Ethereum Sepolia",
  "ARB-SEPOLIA": "Arbitrum Sepolia",
  "BASE-SEPOLIA": "Base Sepolia",
  "OP-SEPOLIA": "Optimism Sepolia",
  "AVAX-FUJI": "Avalanche Fuji",
};

export default function WalletPage() {
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [cctpWallets, setCctpWallets] = useState<CctpWallet[]>([]);
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

      try {
        const walletRes = await fetch(`http://localhost:4000/wallet/for-user/${userId}`);
        if (!walletRes.ok) {
          setError("No wallet found for this account.");
          return;
        }

        const walletJson = await walletRes.json();
        setAddress(walletJson.address);

        const [balanceRes, cctpWalletsRes] = await Promise.all([
          fetch(`http://localhost:4000/wallet/${walletJson.address}/balance`),
          fetch(`http://localhost:4000/wallet/cctp-wallets/${userId}`),
        ]);

        if (balanceRes.ok) {
          const balanceJson = await balanceRes.json();
          setBalance(balanceJson.balance);
        }

        if (cctpWalletsRes.ok) {
          const cctpWalletsJson = await cctpWalletsRes.json();
          setCctpWallets(cctpWalletsJson.wallets ?? []);
        }
      } catch {
        setError("Could not load your wallet. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadWallet();
  }, [router]);

  if (loading) return <p className="text-neutral-400">Loading wallet...</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white">Wallet</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
          Your Arc wallet is used for Relay payments. Cross-chain funding wallets let
          Relay move USDC to Arc through CCTP when the Arc balance is low.
        </p>
      </div>

      <section className="mb-8">
        <h3 className="mb-3 text-lg font-semibold text-white">Relay payment wallet</h3>
        <div className="max-w-xl rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-1 text-sm text-neutral-400">Arc wallet address</p>
          <p className="mb-5 break-all font-mono text-sm text-white">{address}</p>
          <p className="mb-1 text-sm text-neutral-400">Available USDC</p>
          <p className="text-2xl font-semibold text-white">{balance ?? "--"} USDC</p>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white">Cross-chain funding wallets</h3>
        <p className="mt-1 mb-4 max-w-3xl text-sm leading-6 text-neutral-400">
          Relay creates these wallets automatically during signup. Fund any wallet with
          USDC and enough native gas for that chain. When Arc is short of USDC, Relay can
          bridge available funds into Arc through CCTP before completing your payment.
        </p>

        {cctpWallets.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {cctpWallets.map((wallet) => (
              <div key={wallet.blockchain} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
                <p className="text-sm font-medium text-white">
                  {CHAIN_LABELS[wallet.blockchain] ?? wallet.blockchain}
                </p>
                <p className="mt-1 text-xs text-neutral-500">CCTP funding address</p>
                <p className="mt-3 break-all font-mono text-sm text-neutral-300">{wallet.address}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-sm leading-6 text-neutral-400">
            Your cross-chain wallets are still being set up. Refresh this page shortly.
          </div>
        )}
      </section>
    </div>
  );
}
