// backend/src/core/acp/ShopifyACP.ts
//
// Adapts the existing ShopifyAdapter to the ACP interface, same pattern
// as SaleorACP. ShopifyAdapter.ts itself is not modified. Not currently
// in use (Saleor is the active adapter) — this exists so the "every
// adapter implements ACP" claim is true even for the dormant one.

import { ShopifyAdapter } from "../../merchants/ShopifyAdapter";
import { ACP, ACPSearchParams, ACPCheckoutResult } from "./ACP";

export class ShopifyACP implements ACP {
  private adapter: ShopifyAdapter;

  constructor() {
    this.adapter = new ShopifyAdapter();
  }

  async search(params: ACPSearchParams) {
    return this.adapter.search(params);
  }

  async checkout(
    productId: string,
    quantity: number,
    payerAddress?: string,
    email?: string,
    resolvedAddress?: unknown
  ): Promise<ACPCheckoutResult> {
    const result = await this.adapter.checkout(productId, quantity);
    return { checkoutId: (result as any).checkoutUrl ?? (result as any).checkoutId };
  }
}