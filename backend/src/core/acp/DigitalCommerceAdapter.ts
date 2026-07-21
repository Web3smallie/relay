// backend/src/core/acp/DigitalCommerceAdapter.ts
//
// Placeholder for future digital-first commerce (gift cards, airtime,
// data bundles, SaaS subscriptions, domains, cloud credits, etc.).
// No implementation yet.

import { ACP, ACPSearchParams, ACPCheckoutResult } from "./ACP";
import { Product } from "../../merchants/MerchantAdapter";

export class DigitalCommerceAdapter implements ACP {
  async search(params: ACPSearchParams): Promise<Product[]> {
    throw new Error("DigitalCommerceAdapter.search not implemented yet");
  }

  async checkout(
    productId: string,
    quantity: number,
    payerAddress?: string,
    email?: string,
    resolvedAddress?: unknown
  ): Promise<ACPCheckoutResult> {
    throw new Error("DigitalCommerceAdapter.checkout not implemented yet");
  }
}