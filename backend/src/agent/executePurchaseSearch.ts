import { parseConstraints, PurchaseConstraints } from "./constraintParser";
import { ShopifyAdapter } from "../merchants/ShopifyAdapter";
import { Product } from "../merchants/MerchantAdapter";

export type Recommendation = {
  product: Product;
  reasons: string[];
};

export type PurchaseSearchResult = {
  constraints: PurchaseConstraints;
  recommendation: Recommendation | null;
  alternatives: Product[];
};

function buildReasons(product: Product, constraints: PurchaseConstraints, isCheapest: boolean): string[] {
  const reasons: string[] = [];

  if (isCheapest) {
    reasons.push("Lowest price among matching results");
  }

  if (constraints.maxPrice !== null && product.price <= constraints.maxPrice) {
    reasons.push(`Within your budget of $${constraints.maxPrice}`);
  }

  reasons.push(`Matches "${constraints.productQuery}"`);
  reasons.push("Available for purchase");

  return reasons;
}

export async function executePurchaseSearch(request: string): Promise<PurchaseSearchResult> {
  // Step 1: Understand the request
  const constraints = await parseConstraints(request);

  // Step 2: Search the merchant using the extracted constraints
  const adapter = new ShopifyAdapter();
  const results = await adapter.search({
    query: constraints.productQuery,
    maxPrice: constraints.maxPrice ?? undefined,
  });

  // Step 3: Only consider items actually available for purchase
  const available = results.filter((p) => p.available);

  // Step 4: Sort cheapest first
  const sorted = available.sort((a, b) => a.price - b.price);

  if (sorted.length === 0) {
    return { constraints, recommendation: null, alternatives: [] };
  }

  // Step 5: Pick the top match as the recommendation, explain why
  const [best, ...rest] = sorted;
  const reasons = buildReasons(best, constraints, true);

  return {
    constraints,
    recommendation: { product: best, reasons },
    alternatives: rest,
  };
}