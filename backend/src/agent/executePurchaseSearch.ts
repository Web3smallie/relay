import { parseConstraints, PurchaseConstraints } from "./constraintParser";
import { ShopifyAdapter } from "../merchants/ShopifyAdapter";
import { Product } from "../merchants/MerchantAdapter";

export type PurchaseSearchResult = {
  constraints: PurchaseConstraints;
  matches: Product[];
};

export async function executePurchaseSearch(request: string): Promise<PurchaseSearchResult> {
  // Step 1: Understand the request
  const constraints = await parseConstraints(request);

  // Step 2: Search the merchant using the extracted constraints
  const adapter = new ShopifyAdapter();
  const results = await adapter.search({
    query: constraints.productQuery,
    maxPrice: constraints.maxPrice ?? undefined,
  });

  // Step 3: Only return items actually available for purchase
  const available = results.filter((p) => p.available);

  // Step 4: Sort cheapest first — a sensible default when the user asks for "cheapest"
  const sorted = available.sort((a, b) => a.price - b.price);

  return {
    constraints,
    matches: sorted,
  };
}