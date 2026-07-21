// backend/src/core/acp/SaleorACP.ts
//
// Adapts the existing, working SaleorAdapter to the ACP interface.
// This is a WRAPPER — it delegates every call straight through to
// SaleorAdapter with zero behavior change. SaleorAdapter.ts itself
// is not modified.

import { SaleorAdapter } from "../../merchants/SaleorAdapter";
import { ACP, ACPSearchParams, ACPCheckoutResult } from "./ACP";

export class SaleorACP implements ACP {
  private adapter: SaleorAdapter;

  constructor() {
    this.adapter = new SaleorAdapter();
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
    const result = await this.adapter.checkout(
      productId,
      quantity,
      payerAddress,
      email,
      resolvedAddress as any
    );
    return { checkoutId: result.checkoutUrl };
  }

  // compare, authenticateReviews, track, cancel, refund intentionally
  // left unimplemented — Saleor integration doesn't support these yet.
}