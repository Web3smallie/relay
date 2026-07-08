"use client";

import { useState } from "react";
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
  recommendation: { product: Product; reasons: string[]; checkoutUrl: string | null } | null;
  alternatives: Product[];
};

const EXAMPLES = [
  "Find me the cheapest snowboard under $800",
  "I need a snowboard under $700, in stock",
  "What's the best value snowboard you can find?",
];

export default function ShopPage() {
  const [request, setRequest] = useState("");
  const [stage, setStage] = useState<"idle" | "parsing" | "searching" | "done">("idle");
  const [constraints, setConstraints] = useState<Constraints | null>(null);
  const [totalFound, setTotalFound] = useState<number | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function runSearch(text: string) {
    setStage("parsing");
    setError(null);
    setResult(null);
    setConstraints(null);
    setTotalFound(null);

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push("/login");
      return;
    }

    try {
      const parseRes = await fetch("http://localhost:4000/agent/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: text }),
      });
      const parseJson = await parseRes.json();

      if (!parseRes.ok) {
        setError(parseJson.error || "Could not understand that request");
        setStage("idle");
        return;
      }

      setConstraints(parseJson.constraints);
      setStage("searching");

      const searchRes = await fetch("http://localhost:4000/agent/search-with-constraints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ constraints: parseJson.constraints }),
      });
      const searchJson = await searchRes.json();

      if (!searchRes.ok) {
        setError(searchJson.error || "Search failed");
        setStage("idle");
        return;
      }

      setTotalFound(searchJson.totalFound);
      await new Promise((r) => setTimeout(r, 500));

      setResult(searchJson);
      setStage("done");
    } catch {
      setError("Could not reach the server. Is the backend running?");
      setStage("idle");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!request.trim()) return;
    runSearch(request);
  }

  const hasSearched = stage !== "idle" || error !== null;

  function ConstraintTags({ c }: { c: Constraints }) {
    const tags: string[] = [];
    if (c.productQuery) tags.push(c.productQuery);
    if (c.maxPrice !== null) tags.push(`under $${c.maxPrice}`);
    if (c.deliveryDeadline) tags.push(c.deliveryDeadline);
    if (c.minRating !== null) tags.push(`${c.minRating}+ rating`);

    return (
      <div className="flex flex-wrap gap-2">
        {tags.map((t, i) => (
          <span
            key={t}
            className="animate-fade-in-up rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            {t}
          </span>
        ))}
      </div>
    );
  }

  function ProductCard({
    product,
    isRecommended,
    reasons,
    checkoutUrl,
    delayMs,
  }: {
    product: Product;
    isRecommended?: boolean;
    reasons?: string[];
    checkoutUrl?: string | null;
    delayMs?: number;
  }) {
    return (
      <div
        className={`animate-fade-in-up rounded-xl border p-4 transition ${
          isRecommended
            ? "border-neutral-600 bg-neutral-900"
            : "border-neutral-800 bg-neutral-900/50"
        }`}
        style={{ animationDelay: `${delayMs ?? 0}ms` }}
      >
        {isRecommended && (
          <p className="mb-2 inline-block rounded-full bg-white px-2 py-0.5 text-xs font-medium text-black">
            Recommended
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
          <ul className="mb-3 space-y-1">
            {reasons.map((r, i) => (
              <li
                key={i}
                className="animate-fade-in-up text-xs text-neutral-400"
                style={{ animationDelay: `${(delayMs ?? 0) + 150 + i * 100}ms` }}
              >
                • {r}
              </li>
            ))}
          </ul>
        )}

        {isRecommended && (
          <div
            className="animate-fade-in-up mt-2"
            style={{ animationDelay: `${(delayMs ?? 0) + 600}ms` }}
          >
            {checkoutUrl ? (
              
                <a href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-lg bg-white py-2 text-center text-sm font-medium text-black hover:bg-neutral-200"
              >
                Checkout ready — open cart
              </a>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-neutral-700 py-2 text-sm text-neutral-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400" />
                Creating cart...
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <p className="mb-3 text-sm uppercase tracking-widest text-neutral-500">
          Relay Agent
        </p>
        <h1 className="mb-8 max-w-xl text-3xl font-semibold text-white">
          What do you want to buy?
        </h1>

        <form onSubmit={handleSubmit} className="w-full max-w-xl">
          <div className="flex items-center rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-4 focus-within:border-neutral-500">
            <span className="mr-2 text-neutral-600">›</span>
            <input
              autoFocus
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="Find me the cheapest snowboard under $800"
              className="flex-1 bg-transparent text-white outline-none placeholder:text-neutral-600"
            />
            <button
              type="submit"
              disabled={!request.trim()}
              className="ml-3 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-40"
            >
              Search
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
            disabled={stage === "parsing" || stage === "searching" || !request.trim()}
            className="ml-3 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
          >
            {stage === "parsing" || stage === "searching" ? "Working..." : "Search"}
          </button>
        </div>
      </form>

      {error && <p className="text-red-400">{error}</p>}

      {stage === "parsing" && (
        <div className="flex items-center gap-2 text-neutral-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          <p>Understanding your request...</p>
        </div>
      )}

      {constraints && (stage === "searching" || stage === "done") && (
        <div className="mb-4">
          <ConstraintTags c={constraints} />
        </div>
      )}

      {stage === "searching" && totalFound === null && (
        <div className="flex items-center gap-2 text-neutral-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          <p>Searching real merchants...</p>
        </div>
      )}

      {stage === "searching" && totalFound !== null && (
        <p className="animate-fade-in-up text-neutral-400">
          Found {totalFound} matching {totalFound === 1 ? "product" : "products"}. Evaluating best option...
        </p>
      )}

      {stage === "done" && result && !result.recommendation && (
        <p className="text-neutral-500">No matching products found.</p>
      )}

      {stage === "done" && result?.recommendation && (
        <div>
          <div className="mb-6 max-w-sm">
            <ProductCard
              product={result.recommendation.product}
              isRecommended
              reasons={result.recommendation.reasons}
              checkoutUrl={result.recommendation.checkoutUrl}
              delayMs={0}
            />
          </div>

          {result.alternatives.length > 0 && (
            <>
              <h3 className="mb-3 text-sm font-medium text-neutral-400">
                Other options
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.alternatives.map((p, i) => (
                  <ProductCard key={p.id} product={p} delayMs={150 + i * 100} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}