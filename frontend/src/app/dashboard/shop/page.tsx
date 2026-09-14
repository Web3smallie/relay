"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";

type Product = {
  id: string;
  title: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  productUrl: string;
  available: boolean;
};

type Constraints = {
  productQuery: string;
  maxPrice: number | null;
  deliveryDeadline: string | null;
  minRating: number | null;
  notes: string | null;
};

type SearchResult = {
  constraints: Constraints;
  totalFound: number;
  recommendation: {
    product: Product;
    reasons: string[];
    checkoutId: string | null;
    totalPrice: number | null;
  } | null;
  alternatives: Product[];
  needsAddress?: string | null;
};

type LogEntry = {
  text: string;
  status: "active" | "done" | "error";
  link?: {
    text: string;
    url: string;
  };
  badge?: {
    label: string;
    variant: "escrow" | "capture" | "cctp" | "nft" | "void" | "info";
  };
};

const EXAMPLES = [
  "Buy me the cheapest apple juice",
  "Buy me a tee under $30",
  "Find the best value shirt and buy it",
];

function ConstraintTags({ c }: { c: Constraints }) {
  const tags: string[] = [];
  if (c.productQuery) tags.push(c.productQuery);
  if (c.maxPrice !== null) tags.push(`under $${c.maxPrice}`);
  if (c.deliveryDeadline) tags.push(c.deliveryDeadline);
  if (c.minRating !== null) tags.push(`${c.minRating}+ rating`);

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <span
          key={t}
          className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function LogBadge({ badge }: { badge: NonNullable<LogEntry["badge"]> }) {
  const colorMap = {
    escrow: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    capture: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    cctp: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
    nft: "border-purple-500/30 bg-purple-500/10 text-purple-300",
    void: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    info: "border-neutral-700 bg-neutral-800 text-neutral-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider border ${
        colorMap[badge.variant] || colorMap.info
      }`}
    >
      {badge.label}
    </span>
  );
}

function AgentLog({ entries }: { entries: LogEntry[] }) {
  return (
    <div className="mb-6 max-w-xl space-y-2.5 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      {entries.map((entry, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span className="mt-0.5 shrink-0">
            {entry.status === "done" && <span className="text-emerald-400 font-bold">✓</span>}
            {entry.status === "active" && (
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            )}
            {entry.status === "error" && <span className="text-rose-400 font-bold">✕</span>}
          </span>
          <div className="flex flex-wrap items-center gap-1.5 leading-relaxed">
            {entry.badge && <LogBadge badge={entry.badge} />}
            <span
              className={
                entry.status === "error"
                  ? "text-rose-300"
                  : entry.status === "active"
                  ? "text-white font-medium"
                  : "text-neutral-300"
              }
            >
              {entry.text}
            </span>
            {entry.link && (
              <a
                href={entry.link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-mono text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
              >
                <span>{entry.link.text}</span>
                <span className="text-[10px]">↗</span>
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductCard({
  product,
  isRecommended,
  reasons,
  checkoutId,
}: {
  product: Product;
  isRecommended?: boolean;
  reasons?: string[];
  checkoutId?: string | null;
}) {
  const [payStatus, setPayStatus] = useState<
    "idle" | "authorizing" | "capturing" | "success" | "voided" | "error"
  >("idle");
  const [payLog, setPayLog] = useState<LogEntry[]>([]);

  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (isRecommended && checkoutId && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      handlePay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecommended, checkoutId]);

  async function pollForReceipt(cid: string) {
    setPayLog((prev) => [
      ...prev,
      {
        text: "Minting ERC-721 Proof of Purchase NFT on Arc Testnet...",
        status: "active",
      },
    ]);

    const maxAttempts = 12;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2500));

      try {
        const res = await fetch(`${API_URL}/agent/receipt-status/${cid}`);
        const json = await res.json();

        if (json.minted && json.receipt) {
          const shortTx = json.receipt.transactionHash
            ? `${json.receipt.transactionHash.slice(0, 8)}...${json.receipt.transactionHash.slice(-6)}`
            : "";
          setPayLog((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              text: `Proof of Purchase NFT minted (${shortTx})`,
              status: "done",
              badge: { label: "NFT Receipt", variant: "nft" },
              link: json.receipt.transactionHash
                ? {
                    text: "ArcScan",
                    url: `https://testnet.arcscan.app/tx/${json.receipt.transactionHash}`,
                  }
                : undefined,
            };
            return updated;
          });
          return;
        }
      } catch {
        // keep polling silently
      }
    }

    setPayLog((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = {
        text: "Receipt NFT is pending final confirmation — check your wallet shortly",
        status: "done",
        badge: { label: "Minting", variant: "info" },
      };
      return updated;
    });
  }

  async function handlePay() {
    if (!checkoutId) return;
    setPayStatus("authorizing");
    setPayLog([
      {
        text: "Checking Arc wallet balance & cross-chain liquidity...",
        status: "active",
      },
    ]);

    const { data } = await supabase.auth.getSession();
    if (!data.session) return;

    try {
      const payRes = await fetch(`${API_URL}/agent/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.session.user.id, checkoutId }),
      });

      const payJson = await payRes.json();

      if (!payRes.ok) {
        setPayLog((prev) => [
          { ...prev[0], status: "done" },
          { text: payJson.error || "Payment authorization failed", status: "error" },
        ]);
        setPayStatus("error");
        return;
      }

      const liquidityLogs: LogEntry[] = payJson.liquidity?.bridged
        ? [
            {
              text: `Arc balance low. Bridged ${payJson.liquidity.amountBridged} USDC from ${payJson.liquidity.fromChain} via Circle CCTP.`,
              status: "done",
              badge: { label: "CCTP Liquidity", variant: "cctp" },
            },
          ]
        : [{ text: "Arc wallet verified with sufficient USDC balance.", status: "done" }];

      const shortHash = payJson.paymentHash
        ? `${payJson.paymentHash.slice(0, 8)}...${payJson.paymentHash.slice(-6)}`
        : "";

      setPayLog((prev) => [
        { ...prev[0], status: "done" },
        ...liquidityLogs,
        {
          text: `Authorized & reserved funds in Arc Commerce Escrow (${shortHash})`,
          status: "done",
          badge: { label: "Escrow Locked", variant: "escrow" },
          link: payJson.paymentHash
            ? {
                text: "ArcScan",
                url: `https://testnet.arcscan.app/tx/${payJson.paymentHash}`,
              }
            : undefined,
        },
        {
          text: "Confirming order with Saleor merchant & capturing escrow...",
          status: "active",
        },
      ]);
      setPayStatus("capturing");

      const processRes = await fetch(`${API_URL}/saleor-payment-process-trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: payJson.transactionId }),
      });

      const processJson = await processRes.json();

      if (!processRes.ok) {
        setPayLog((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            text: processJson.error || "Merchant order creation failed. Escrow voided.",
            status: "error",
            badge: { label: "Escrow Voided", variant: "void" },
          };
          return [
            ...updated,
            {
              text: "Escrow funds automatically released back to your Arc wallet.",
              status: "done",
            },
          ];
        });
        setPayStatus("voided");
        return;
      }

      setPayLog((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          text: "Saleor merchant confirmed order — Escrow captured & released to merchant.",
          status: "done",
          badge: { label: "Escrow Captured", variant: "capture" },
        };
        return updated;
      });
      setPayStatus("success");

      pollForReceipt(checkoutId);
    } catch (err) {
      setPayLog((prev) => [
        ...prev,
        { text: (err as Error).message || "Something went wrong during payment", status: "error" },
      ]);
      setPayStatus("error");
    }
  }

  return (
    <div
      className={`rounded-xl border p-4 transition ${
        isRecommended
          ? "border-neutral-600 bg-neutral-900"
          : "border-neutral-800 bg-neutral-900/50"
      }`}
    >
      {isRecommended && (
        <p className="mb-2 inline-block rounded-full bg-white px-2 py-0.5 text-xs font-medium text-black">
          Recommended — I'm buying this one
        </p>
      )}

      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt={product.title}
          className="mb-3 h-40 w-full rounded-lg object-cover"
        />
      )}

      <p className="font-medium text-white">{product.title}</p>
      <p className="mb-2 text-lg font-semibold text-white">
        ${product.price.toFixed(2)} {product.currency}
      </p>

      {reasons && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium text-neutral-500">Why I picked this:</p>
          <ul className="space-y-1">
            {reasons.map((r, i) => (
              <li key={i} className="text-xs text-neutral-400">
                • {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {checkoutId && payStatus === "idle" && !isRecommended && (
        <button
          onClick={handlePay}
          className="mt-3 w-full rounded-lg bg-neutral-800 hover:bg-neutral-700 py-2 text-xs font-medium text-white border border-neutral-700 transition"
        >
          Pay ${product.price.toFixed(2)} with Arc Escrow
        </button>
      )}

      <div className="mt-2">
        {payStatus !== "idle" && (
          <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-medium text-neutral-300">
                  Arc Commerce Escrow Rail
                </span>
              </div>
              <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 border border-neutral-800">
                Arc Testnet
              </span>
            </div>

            <div className="space-y-1.5 pt-0.5">
              {payLog.map((entry, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 shrink-0">
                    {entry.status === "done" && <span className="text-emerald-400 font-bold">✓</span>}
                    {entry.status === "active" && (
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                    )}
                    {entry.status === "error" && <span className="text-rose-400 font-bold">✕</span>}
                  </span>
                  <div className="flex flex-wrap items-center gap-1 leading-snug">
                    {entry.badge && <LogBadge badge={entry.badge} />}
                    <span
                      className={
                        entry.status === "error"
                          ? "text-rose-300"
                          : entry.status === "active"
                          ? "text-white"
                          : "text-neutral-400"
                      }
                    >
                      {entry.text}
                    </span>
                    {entry.link && (
                      <a
                        href={entry.link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 font-mono text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline"
                      >
                        <span>{entry.link.text}</span>
                        <span className="text-[9px]">↗</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {payStatus === "success" && (
              <div className="mt-2 rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-center text-[11px] text-emerald-400">
                ✓ 2-Phase Escrow Settlement Complete
              </div>
            )}

            {payStatus === "voided" && (
              <div className="mt-2 rounded border border-rose-500/20 bg-rose-500/5 px-2 py-1 text-center text-[11px] text-rose-400">
                ✕ Order failed — Escrow voided and funds returned
              </div>
            )}

            {(payStatus === "error" || payStatus === "voided") && (
              <button
                onClick={() => {
                  hasTriggeredRef.current = false;
                  handlePay();
                }}
                className="mt-1 block text-xs text-cyan-400 hover:text-cyan-300 underline"
              >
                Retry Escrow Payment
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ShopPage() {
  const [request, setRequest] = useState("");
  const [stage, setStage] = useState<"idle" | "working" | "done">("idle");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [constraints, setConstraints] = useState<Constraints | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [pendingAddressLabel, setPendingAddressLabel] = useState<string | null>(null);
  const [addressText, setAddressText] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  const router = useRouter();

  function updateLastLog(status: LogEntry["status"]) {
    setLog((prev) => {
      const updated = [...prev];
      if (updated.length > 0) updated[updated.length - 1] = { ...updated[updated.length - 1], status };
      return updated;
    });
  }

  function addLog(text: string, status: LogEntry["status"] = "active") {
    setLog((prev) => [...prev, { text, status }]);
  }

  async function runSearch(text: string) {
    setStage("working");
    setError(null);
    setResult(null);
    setConstraints(null);
    setPendingAddressLabel(null);
    setLog([]);

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push("/login");
      return;
    }

    const uid = data.session.user.id;
    setUserId(uid);

    addLog("Checking your wallet...");
    const walletRes = await fetch(`${API_URL}/wallet/for-user/${uid}`);
    if (!walletRes.ok) {
      updateLastLog("error");
      setError("No wallet found for your account.");
      setStage("idle");
      return;
    }
    const walletJson = await walletRes.json();
    const payerAddress = walletJson.address;
    updateLastLog("done");

    try {
      addLog("Understanding your request...");
      const parseRes = await fetch(`${API_URL}/agent/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: text }),
      });
      const parseJson = await parseRes.json();

      if (!parseRes.ok) {
        updateLastLog("error");
        setError(parseJson.error || "Could not understand that request");
        setStage("idle");
        return;
      }

      updateLastLog("done");
      setConstraints(parseJson.constraints);

      addLog("Searching the merchant catalog...");
      const searchRes = await fetch(`${API_URL}/agent/search-with-constraints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ constraints: parseJson.constraints, payerAddress, userId: uid }),
      });
      const searchJson: SearchResult = await searchRes.json();

      if (!searchRes.ok) {
        updateLastLog("error");
        setError((searchJson as any).error || "Search failed");
        setStage("idle");
        return;
      }

      if (searchJson.needsAddress) {
        updateLastLog("done");
        addLog(`I don't have an address saved for "${searchJson.needsAddress}" yet — what's the address?`, "active");
        setPendingAddressLabel(searchJson.needsAddress);
        setStage("working");
        return;
      }

      updateLastLog("done");
      addLog(`Found ${searchJson.totalFound} matching product${searchJson.totalFound === 1 ? "" : "s"}`, "done");
      addLog("Evaluating price, availability, and fit...", "active");

      await new Promise((r) => setTimeout(r, 600));
      updateLastLog("done");

      if (searchJson.recommendation) {
        addLog(`Decided on "${searchJson.recommendation.product.title}" — preparing checkout...`, "active");
        await new Promise((r) => setTimeout(r, 400));
        updateLastLog("done");
      }

      setResult(searchJson);
      setStage("done");
    } catch {
      updateLastLog("error");
      setError("Could not reach the server. Is the backend running?");
      setStage("idle");
    }
  }

  async function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addressText.trim() || !pendingAddressLabel || !userId) return;

    setSavingAddress(true);
    updateLastLog("done");
    addLog("Parsing that address...", "active");

    try {
      const parseAddrRes = await fetch(`${API_URL}/agent/parse-address`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressText }),
      });
      const parseAddrJson = await parseAddrRes.json();

      if (!parseAddrRes.ok) {
        updateLastLog("error");
        setError(parseAddrJson.error || "Could not understand that address");
        setSavingAddress(false);
        return;
      }

      updateLastLog("done");
      addLog(`Saving this as your "${pendingAddressLabel}" address...`, "active");

      const saveRes = await fetch(`${API_URL}/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          label: pendingAddressLabel,
          street: parseAddrJson.address.street,
          city: parseAddrJson.address.city,
          state: parseAddrJson.address.state,
          postalCode: parseAddrJson.address.zip,
          country: parseAddrJson.address.country,
        }),
      });

      if (!saveRes.ok) {
        updateLastLog("error");
        setError("Could not save that address");
        setSavingAddress(false);
        return;
      }

      updateLastLog("done");
      addLog("Resuming your order...", "active");

      const resumedText = request;
      setPendingAddressLabel(null);
      setAddressText("");
      setSavingAddress(false);

      runSearch(resumedText);
    } catch {
      updateLastLog("error");
      setError("Something went wrong saving that address");
      setSavingAddress(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!request.trim()) return;
    runSearch(request);
  }

  const hasSearched = stage !== "idle" || error !== null;

  if (!hasSearched) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <p className="mb-3 text-sm uppercase tracking-widest text-neutral-500">
          Relay Agent
        </p>
        <h1 className="mb-8 max-w-xl text-3xl font-semibold text-white">
          What services do you require?
        </h1>

        <form onSubmit={handleSubmit} className="w-full max-w-xl">
          <div className="flex items-center rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-4 focus-within:border-neutral-500">
            <span className="mr-2 text-neutral-600">›</span>
            <input
              autoFocus
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="Buy me the cheapest apple juice"
              className="flex-1 bg-transparent text-white outline-none placeholder:text-neutral-600"
            />
            <button
              type="submit"
              disabled={!request.trim()}
              className="ml-3 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-40"
            >
              Go
            </button>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setRequest(ex);
                runSearch(ex);
              }}
              className="rounded-full border border-neutral-800 px-3 py-1.5 text-xs text-neutral-400 hover:border-neutral-600 hover:text-white"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-6 max-w-2xl">
        <div className="flex items-center rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 focus-within:border-neutral-600">
          <span className="mr-2 text-neutral-600">›</span>
          <input
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            className="flex-1 bg-transparent text-white outline-none"
          />
          <button
            type="submit"
            disabled={stage === "working" || !request.trim()}
            className="ml-3 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
          >
            {stage === "working" ? "Working..." : "Go"}
          </button>
        </div>
      </form>

      {error && <p className="text-red-400">{error}</p>}

      {log.length > 0 && <AgentLog entries={log} />}

      {pendingAddressLabel && (
        <form onSubmit={handleAddressSubmit} className="mb-6 max-w-xl">
          <div className="flex items-center rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 focus-within:border-neutral-500">
            <span className="mr-2 text-neutral-600">›</span>
            <input
              autoFocus
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              placeholder="e.g. 23 Demo Street, New York, NY 10001"
              className="flex-1 bg-transparent text-white outline-none placeholder:text-neutral-600"
              disabled={savingAddress}
            />
            <button
              type="submit"
              disabled={!addressText.trim() || savingAddress}
              className="ml-3 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-40"
            >
              {savingAddress ? "Saving..." : "Send"}
            </button>
          </div>
        </form>
      )}

      {constraints && (
        <div className="mb-4">
          <ConstraintTags c={constraints} />
        </div>
      )}

      {stage === "done" && result && !result.recommendation && (
        <p className="text-neutral-500">No matching products found.</p>
      )}

      {result?.recommendation && (
        <div>
          <div className="mb-6 max-w-sm">
            <ProductCard
              product={result.recommendation.product}
              isRecommended
              reasons={result.recommendation.reasons}
              checkoutId={result.recommendation.checkoutId}
            />
          </div>

          {result.alternatives.length > 0 && (
            <>
              <h3 className="mb-3 text-sm font-medium text-neutral-400">
                Other options I considered
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.alternatives.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
