"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";
import CopyAddressButton from "@/components/CopyAddressButton";

type CctpWallet = {
  blockchain: string;
  address: string;
};

const CHAIN_META: Record<
  string,
  { label: string; color: string; badgeColor: string; icon: string }
> = {
  "ETH-SEPOLIA": {
    label: "Ethereum Sepolia",
    color: "from-indigo-600/20 via-purple-900/20 to-neutral-950 border-indigo-500/30",
    badgeColor: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
    icon: "Ξ",
  },
  "ARB-SEPOLIA": {
    label: "Arbitrum Sepolia",
    color: "from-cyan-600/20 via-blue-900/20 to-neutral-950 border-cyan-500/30",
    badgeColor: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    icon: "▲",
  },
  "BASE-SEPOLIA": {
    label: "Base Sepolia",
    color: "from-blue-600/20 via-sky-900/20 to-neutral-950 border-blue-500/30",
    badgeColor: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    icon: "●",
  },
  "OP-SEPOLIA": {
    label: "Optimism Sepolia",
    color: "from-rose-600/20 via-red-900/20 to-neutral-950 border-rose-500/30",
    badgeColor: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    icon: "🔴",
  },
  "AVAX-FUJI": {
    label: "Avalanche Fuji",
    color: "from-red-600/20 via-orange-900/20 to-neutral-950 border-red-500/30",
    badgeColor: "bg-red-500/10 text-red-300 border-red-500/30",
    icon: "❄",
  },
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
        const walletRes = await fetch(`${API_URL}/wallet/for-user/${userId}`);
        if (!walletRes.ok) {
          setError("No wallet found for this account.");
          return;
        }

        const walletJson = await walletRes.json();
        setAddress(walletJson.address);

        const [balanceRes, cctpWalletsRes] = await Promise.all([
          fetch(`${API_URL}/wallet/${walletJson.address}/balance`),
          fetch(`${API_URL}/wallet/cctp-wallets/${userId}`),
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-sm">Loading wallet & CCTP bridges...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-300">
        <p className="font-semibold">Wallet Error</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      {/* Header Banner */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Arc Testnet (5042002)
          </span>
          <span className="rounded-full bg-violet-500/10 border border-violet-500/30 px-3 py-1 text-xs font-medium text-violet-300">
            Circle CCTP Protocol
          </span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Wallet & Funding Vault
        </h2>
        <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-neutral-300">
          Your Arc wallet is Relay's primary execution account. Dedicated cross-chain deposit addresses
          automatically bridge USDC to Arc via Circle CCTP when liquidity is low.
        </p>
      </div>

      {/* Primary Payment Vault (Arc Testnet) */}
      <section>
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-[#0a1815]/60 to-[#090D16] p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-[90px]" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-xs font-mono font-medium text-emerald-400">
                  EOA Account
                </span>
                <span className="text-xs text-neutral-400">• Gasless Pulls Sponsored</span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Available Arc Balance
              </p>
              <h3 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                {balance ? `${parseFloat(balance).toFixed(2)}` : "0.00"}{" "}
                <span className="text-2xl text-emerald-400 font-semibold">USDC</span>
              </h3>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span>Arc Address:</span>
                <span className="font-mono text-neutral-200">{address}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {address && <CopyAddressButton address={address} className="h-11 px-4 text-sm" />}
              {address && (
                <a
                  href={`https://testnet.arcscan.app/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-sm font-medium transition"
                >
                  <span>View on ArcScan</span>
                  <span className="text-xs">↗</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Cross-Chain CCTP Funding Section */}
      <section className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Cross-Chain Funding Addresses</h3>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-neutral-400">
            Send USDC on any supported network to these dedicated Relay addresses. Whenever your Arc balance
            is insufficient during a purchase, Relay utilizes Circle CCTP to bridge and settle on Arc automatically.
          </p>
        </div>

        {cctpWallets.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {cctpWallets.map((wallet) => {
              const meta = CHAIN_META[wallet.blockchain] || {
                label: wallet.blockchain,
                color: "from-neutral-900/60 to-neutral-950 border-white/[0.08]",
                badgeColor: "bg-white/[0.05] text-neutral-300 border-white/10",
                icon: "⚡",
              };

              return (
                <div
                  key={wallet.blockchain}
                  className={`rounded-2xl border bg-gradient-to-br p-5 backdrop-blur-md transition-all hover:scale-[1.01] ${meta.color}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold">
                        {meta.icon}
                      </span>
                      <span className="text-base font-bold text-white">{meta.label}</span>
                    </div>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider rounded-full border px-2.5 py-0.5 ${meta.badgeColor}`}>
                      CCTP Active
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-medium">
                    Funding Address
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-neutral-200 bg-black/40 p-2.5 rounded-lg border border-white/[0.06]">
                    {wallet.address}
                  </p>

                  <div className="mt-3.5 flex items-center justify-between">
                    <CopyAddressButton address={wallet.address} className="text-xs" />
                    <span className="text-[11px] text-neutral-500">Auto-bridged to Arc</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.08] bg-neutral-900/60 p-6 text-sm text-neutral-400 text-center">
            Your cross-chain wallets are being provisioned by the Developer-Controlled Wallets service. Please refresh shortly.
          </div>
        )}
      </section>
    </div>
  );
}

