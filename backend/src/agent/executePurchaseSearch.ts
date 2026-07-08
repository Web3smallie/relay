import { parseConstraints, PurchaseConstraints } from "./constraintParser";
import { ShopifyAdapter } from "../merchants/ShopifyAdapter";
import { Product } from "../merchants/MerchantAdapter";

export type Recommendation = {
  product: Product;
  reasons: string[];
  checkoutUrl: string | null;
};

export type PurchaseSearchResult = {
  constraints: PurchaseConstraints;
  totalFound: number;
  recommendation: Recommendation | null;
  alternatives: Product[];
};

function buildReasons(product: Product, constraints: PurchaseConstraints, isCheapest: boolean): string[] {
  const reasons: string[] = [];
  if (isCheapest) reasons.push("Lowest price among matching results");
  if (constraints.maxPrice !== null && product.price <= constraints.maxPrice) {
    reasons.push(`Within your budget of $${constraints.maxPrice}`);
  }
  reasons.push(`Matches "${constraints.productQuery}"`);
  reasons.push("Available for purchase");
  return reasons;
}

export async function searchWithConstraints(
  constraints: PurchaseConstraints
): Promise<PurchaseSearchResult> {
  const adapter = new ShopifyAdapter();
  const results = await adapter.search({
    query: constraints.productQuery,
    maxPrice: constraints.maxPrice ?? undefined,
  });

  const available = results.filter((p) => p.available);
  const sorted = available.sort((a, b) => a.price - b.price);

  if (sorted.length === 0) {
    return { constraints, totalFound: 0, recommendation: null, alternatives: [] };
  }

  const [best, ...rest] = sorted;
  const reasons = buildReasons(best, constraints, true);

  // Automatically create the cart for the recommended product — no button required
  let checkoutUrl: string | null = null;
  try {
    const cart = await adapter.checkout(best.id, 1);
    checkoutUrl = cart.checkoutUrl;
  } catch (err) {
    console.error("Cart creation failed:", err);
  }

  return {
    constraints,
    totalFound: sorted.length,
    recommendation: { product: best, reasons, checkoutUrl },
    alternatives: rest,
  };
}

export async function executePurchaseSearch(request: string): Promise<PurchaseSearchResult> {
  const constraints = await parseConstraints(request);
  return searchWithConstraints(constraints);
}