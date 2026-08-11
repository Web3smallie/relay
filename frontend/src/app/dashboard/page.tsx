"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardHomePage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
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
        const res = await fetch(`http://localhost:4000/profile/${userId}`);
        if (res.ok) {
          const json = await res.json();
          setFullName(json.profile?.full_name ?? null);
        }
      } catch {
        // Fall back to showing the email only if the backend is unavailable.
      }

      setLoading(false);
    }

    checkSessionAndProfile();
  }, [router]);

  if (loading) {
    return <p className="text-neutral-400">Loading...</p>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <section className="mb-10">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
          Relay dashboard
        </p>

        <h2 className="mb-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Welcome back{fullName ? `, ${fullName}` : ""}.
        </h2>

        <p className="max-w-2xl text-base leading-7 text-neutral-400">
          Choose what you want to do. Relay helps you discover services, manage your
          USDC wallet, and keep the information needed to complete transactions.
        </p>
      </section>

      <section aria-labelledby="start-heading">
        <div className="mb-4">
          <h3 id="start-heading" className="text-lg font-semibold text-white">
            Start here
          </h3>

          <p className="mt-1 text-sm text-neutral-500">
            Everything you need to prepare and complete a transaction.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/dashboard/shop"
            className="group rounded-2xl border border-neutral-800 bg-neutral-900 p-6 transition hover:-translate-y-0.5 hover:border-neutral-600 hover:bg-neutral-800"
          >
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-bold text-black">
              S
            </div>

            <h4 className="mb-2 text-lg font-semibold text-white">
              Shop with Relay
            </h4>

            <p className="text-sm leading-6 text-neutral-400">
              Search for products and services in plain language. Relay finds options,
              prepares the checkout, and guides the transaction.
            </p>

            <span className="mt-5 inline-block text-sm font-medium text-white group-hover:underline">
              Start shopping -&gt;
            </span>
          </Link>

          <Link
            href="/dashboard/wallet"
            className="group rounded-2xl border border-neutral-800 bg-neutral-900 p-6 transition hover:-translate-y-0.5 hover:border-neutral-600 hover:bg-neutral-800"
          >
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-lg font-bold text-black">
              W
            </div>

            <h4 className="mb-2 text-lg font-semibold text-white">Wallet</h4>

            <p className="text-sm leading-6 text-neutral-400">
              View your Relay wallet address and USDC balance. Use your wallet details
              to fund it before making a payment.
            </p>

            <span className="mt-5 inline-block text-sm font-medium text-white group-hover:underline">
              View wallet -&gt;
            </span>
          </Link>

          <Link
            href="/dashboard/addresses"
            className="group rounded-2xl border border-neutral-800 bg-neutral-900 p-6 transition hover:-translate-y-0.5 hover:border-neutral-600 hover:bg-neutral-800"
          >
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400 text-lg font-bold text-black">
              A
            </div>

            <h4 className="mb-2 text-lg font-semibold text-white">
              Delivery addresses
            </h4>

            <p className="text-sm leading-6 text-neutral-400">
              Add and manage delivery addresses so Relay has the details required when a
              purchase needs shipping.
            </p>

            <span className="mt-5 inline-block text-sm font-medium text-white group-hover:underline">
              Manage addresses -&gt;
            </span>
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <h3 className="mb-2 text-lg font-semibold text-white">
            How a Relay purchase works
          </h3>

          <p className="mb-5 max-w-2xl text-sm leading-6 text-neutral-400">
            Tell Relay what you need. It turns your request into a commerce flow:
            finding the service, preparing checkout, executing payment, and recording
            the result.
          </p>

          <ol className="grid gap-3 sm:grid-cols-4">
            {[
              ["1", "Describe", "Tell Relay what you want."],
              ["2", "Discover", "Review matching options."],
              ["3", "Pay", "Use your USDC wallet."],
              ["4", "Record", "Receive a verified receipt."],
            ].map(([number, title, description]) => (
              <li
                key={number}
                className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"
              >
                <span className="mb-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-800 text-xs font-semibold text-white">
                  {number}
                </span>

                <p className="text-sm font-medium text-white">{title}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-500">
                  {description}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <p className="text-sm text-neutral-500">Signed in as</p>

          <p className="mt-2 break-all text-sm font-medium text-white">
            {email ?? "Your Relay account"}
          </p>

          <div className="my-5 border-t border-neutral-800" />

          <p className="text-sm leading-6 text-neutral-400">
            Your wallet, addresses, and future transaction activity are connected to
            this account.
          </p>
        </div>
      </section>
    </div>
  );
}