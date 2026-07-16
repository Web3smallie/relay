"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

function AgentLog({ entries }: { entries: LogEntry[] }) {
  return (
    <div className="mb-6 max-w-xl space-y-2 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      {entries.map((entry, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span className="mt-0.5">
            {entry.status === "done" && <span className="text-green-500">✓</span>}
            {entry.status === "active" && (
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
            )}
            {entry.status === "error" && <span className="text-red-500">✕</span>}
          </span>
          <span
            className={
              entry.status === "error"
                ? "text-red-400"
                : entry.status === "active"
                ? "text-white"
                : "text-neutral-400"
            }
          >
            {entry.text}
          </span>
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
    "idle" | "paying" | "confirming" | "success" | "error"
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

  async function handlePay() {
    if (!checkoutId) return;
    setPayStatus("paying");
    setPayLog([{ text: "Initiating Relay Programmable Payment — sending USDC from your wallet...", status: "active" }]);

    const { data } = await supabase.auth.getSession();
    if (!data.session) return;

    try {
      const payRes = await fetch("http://localhost:4000/agent/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.session.user.id, checkoutId }),
      });

      const payJson = await payRes.json();

      if (!payRes.ok) {
        setPayLog((prev) => [
          { ...prev[0], status: "done" },
          { text: payJson.error || "Payment failed", status: "error" },
        ]);
        setPayStatus("error");
        return;
      }
      setPayLog((prev) => [
        { ...prev[0], status: "done" },
        { text: `Payment sent via Relay Programmable Payment — tx ${payJson.paymentHash.slice(0, 10)}...`, status: "done" },
        { text: "Confirming payment on-chain with merchant...", status: "active" },
      ]);
      setPayStatus("confirming");

      const processRes = await fetch("http://localhost:4000/saleor-payment-process-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: payJson.transactionId }),
      });

      const processJson = await processRes.json();

      setPayLog((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], status: "done" };
        return [...updated, { text: "Order placed with merchant", status: "done" }];
      });
      setPayStatus("success");
    } catch {
      setPayLog((prev) => [...prev, { text: "Something went wrong", status: "error" }]);
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

      {isRecommended && (
        <div className="mt-2">
          {payStatus !== "idle" && (
            <div className="space-y-1.5 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
              {payLog.map((entry, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5">
                    {entry.status === "done" && <span className="text-green-500">✓</span>}
                    {entry.status === "active" && (
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    )}
                    {entry.status === "error" && <span className="text-red-500">✕</span>}
                  </span>
                  <span
                    className={
                      entry.status === "error"
                        ? "text-red-400"
                        : entry.status === "active"
                        ? "text-white"
                        : "text-neutral-400"
                    }
                  >
                    {entry.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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

  // Address pause/resume state
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
    const walletRes = await fetch(`http://localhost:4000/wallet/for-user/${uid}`);
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
      const parseRes = await fetch("http://localhost:4000/agent/parse", {
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
      const searchRes = await fetch("http://localhost:4000/agent/search-with-constraints", {
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

      // Agent needs a delivery address it doesn't have yet — pause here
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
      const parseAddrRes = await fetch("http://localhost:4000/agent/parse-address", {
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

      const saveRes = await fetch("http://localhost:4000/addresses", {
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