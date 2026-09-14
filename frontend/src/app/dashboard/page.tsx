"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";

export default function DashboardHomePage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkSessionAndProfile() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      const userId = data.session.user.id;
      setEmail(data.session.user.email ?? null);

      try {
        const profileRes = await fetch(`${API_URL}/profile/${userId}`);
        if (profileRes.ok) {
          const json = await profileRes.json();
          setFullName(json.profile?.full_name ?? null);
        }
      } catch {
        // Fall back gracefully
      }

      try {
        const walletRes = await fetch(`${API_URL}/wallet/for-user/${userId}`);
        if (walletRes.ok) {
          const walletJson = await walletRes.json();
          setWalletAddress(walletJson.address);

          const balRes = await fetch(`${API_URL}/wallet/${walletJson.address}/balance`);
          if (balRes.ok) {
            const balJson = await balRes.json();
            setBalance(balJson.balance);
          }
        }
      } catch {
        // Fall back gracefully
      }

      setLoading(false);
    }

    checkSessionAndProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <span className="text-sm">Loading Relay dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-neutral-900/80 via-[#0e1424]/80 to-[#120f26]/80 p-6 sm:p-10 backdrop-blur-xl shadow-2xl">
        {/* Glow ambient effects */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-violet-600/25 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-[90px]" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Arc Testnet (5042002)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
              ⚡ 2-Phase Escrow Rail Active
            </span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
              {fullName || "Agent Pilot"}
            </span>
            .
          </h2>

          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-neutral-300">
            Relay is your autonomous commerce execution layer. Command AI agents to source products,
            orchestrate checkout, lock funds in on-chain escrow, and deliver verified NFT receipts.
          </p>
        </div>
      </section>

      {/* Metrics / Live Highlights Row */}
      <section className="grid gap-4 sm:grid-cols-3">
        {/* Metric 1: Wallet Balance */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 via-neutral-900/60 to-neutral-950 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
              Arc Payment Wallet
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-white tracking-tight">
            {balance ? `${parseFloat(balance).toFixed(2)} USDC` : "-- USDC"}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-mono text-neutral-400 truncate max-w-[140px]">
              {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connecting..."}
            </span>
            <Link href="/dashboard/wallet" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Top up →
            </Link>
          </div>
        </div>

        {/* Metric 2: Escrow Protocol */}
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/30 via-neutral-900/60 to-neutral-950 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">
              Commerce Escrow
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-white tracking-tight">AuthCaptureEscrow</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Gasless ERC-3009</span>
            <Link href="/dashboard/shop" className="text-violet-400 hover:text-violet-300 font-medium">
              Shop agent →
            </Link>
          </div>
        </div>

        {/* Metric 3: CCTP Liquidity */}
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 via-neutral-900/60 to-neutral-950 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">
              Cross-Chain CCTP
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-white tracking-tight">5 Chains Ready</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Auto-bridged to Arc</span>
            <Link href="/dashboard/wallet" className="text-cyan-400 hover:text-cyan-300 font-medium">
              View bridges →
            </Link>
          </div>
        </div>
      </section>

      {/* Balanced 2x2 Action Grid */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Execute with Relay</h3>
            <p className="mt-1 text-sm text-neutral-400">
              Autonomous workflows, connected services, and cross-chain treasury management.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Card 1: Shop */}
          <Link
            href="/dashboard/shop"
            className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#120F24]/90 via-[#0e1220]/90 to-neutral-950 p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-2xl hover:shadow-violet-500/10"
          >
            <div className="pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full bg-violet-600/20 blur-2xl group-hover:bg-violet-600/30 transition" />

            <div className="flex items-center justify-between mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <span className="rounded-full bg-violet-500/10 border border-violet-500/30 px-3 py-1 text-xs font-semibold text-violet-300">
                On-Chain Escrow
              </span>
            </div>

            <h4 className="text-xl font-bold text-white group-hover:text-violet-300 transition">
              Shop with Relay Agent
            </h4>

            <p className="mt-2.5 text-sm leading-relaxed text-neutral-400">
              Prompt your agent in natural language. Relay searches merchant catalogs, reserves funds in
              Arc escrow, executes checkout, and issues an on-chain receipt NFT.
            </p>

            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-violet-400 group-hover:translate-x-1 transition">
              <span>Start shopping</span>
              <span>→</span>
            </div>
          </Link>

          {/* Card 2: Services */}
          <Link
            href="/dashboard/services"
            className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#1C1408]/90 via-[#15111b]/90 to-neutral-950 p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/10"
          >
            <div className="pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full bg-amber-500/20 blur-2xl group-hover:bg-amber-500/30 transition" />

            <div className="flex items-center justify-between mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-300">
                Direct Treasury Rail
              </span>
            </div>

            <h4 className="text-xl font-bold text-white group-hover:text-amber-300 transition">
              Connected Services
            </h4>

            <p className="mt-2.5 text-sm leading-relaxed text-neutral-400">
              Explore instant-settlement utilities. Top up international mobile airtime via Reloadly or
              search live worldwide flight offers powered by Duffel.
            </p>

            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-amber-400 group-hover:translate-x-1 transition">
              <span>Browse services</span>
              <span>→</span>
            </div>
          </Link>

          {/* Card 3: Wallet */}
          <Link
            href="/dashboard/wallet"
            className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#061814]/90 via-[#0a141c]/90 to-neutral-950 p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/10"
          >
            <div className="pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full bg-emerald-500/20 blur-2xl group-hover:bg-emerald-500/30 transition" />

            <div className="flex items-center justify-between mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-300">
                CCTP Auto-Bridge
              </span>
            </div>

            <h4 className="text-xl font-bold text-white group-hover:text-emerald-300 transition">
              Wallet & Funding
            </h4>

            <p className="mt-2.5 text-sm leading-relaxed text-neutral-400">
              Manage your Arc Testnet EOA wallet address, check USDC balances, and fund cross-chain deposit
              addresses to automate cross-chain liquidity bridging.
            </p>

            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-emerald-400 group-hover:translate-x-1 transition">
              <span>View wallet</span>
              <span>→</span>
            </div>
          </Link>

          {/* Card 4: Addresses */}
          <Link
            href="/dashboard/addresses"
            className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#12111E]/90 via-[#0a1120]/90 to-neutral-950 p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/40 hover:shadow-2xl hover:shadow-cyan-500/10"
          >
            <div className="pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full bg-cyan-500/20 blur-2xl group-hover:bg-cyan-500/30 transition" />

            <div className="flex items-center justify-between mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-semibold text-cyan-300">
                Buyer Profiles
              </span>
            </div>

            <h4 className="text-xl font-bold text-white group-hover:text-cyan-300 transition">
              Delivery Addresses
            </h4>

            <p className="mt-2.5 text-sm leading-relaxed text-neutral-400">
              Save labeled physical shipping locations (Home, Office) and recipient info. Your AI shopping
              agent uses these automatically to quote shipping and complete orders.
            </p>

            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-cyan-400 group-hover:translate-x-1 transition">
              <span>Manage addresses</span>
              <span>→</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Visual Commerce Protocol Flow Stepper */}
      <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0C101A]/90 to-neutral-950 p-6 sm:p-8 backdrop-blur-xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-lg font-bold text-white">How Relay Agent Commerce Works</h4>
            <p className="text-sm text-neutral-400">From user prompt to on-chain settlement & verified NFT receipt.</p>
          </div>
          <span className="rounded-full bg-white/[0.05] border border-white/[0.1] px-3 py-1 text-xs font-mono text-neutral-300">
            Commerce Protocol v2.0
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {[
            {
              step: "01",
              title: "Prompt & Parse",
              desc: "Plain language request is converted into merchant query constraints.",
              color: "border-violet-500/40 text-violet-400 bg-violet-500/10",
            },
            {
              step: "02",
              title: "Reserve Escrow",
              desc: "Gasless ERC-3009 authorization locks funds safely in AuthCaptureEscrow.",
              color: "border-amber-500/40 text-amber-400 bg-amber-500/10",
            },
            {
              step: "03",
              title: "Merchant Fulfill",
              desc: "Order is confirmed with the merchant and escrow funds are captured.",
              color: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10",
            },
            {
              step: "04",
              title: "Mint Receipt NFT",
              desc: "Permanent ERC-721 proof-of-purchase token is minted to your Arc wallet.",
              color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5 relative transition hover:border-white/20"
            >
              <span className={`inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-bold font-mono mb-3 ${s.color}`}>
                {s.step}
              </span>
              <p className="font-semibold text-white text-sm">{s.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

