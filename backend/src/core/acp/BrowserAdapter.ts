// backend/src/core/acp/BrowserAdapter.ts
//
// Placeholder for future browser-based commerce execution (Playwright /
// Browser Use / Stagehand) — lets Relay execute commerce on websites
// without a native merchant integration. No implementation yet.

import { ACP, ACPSearchParams, ACPCheckoutResult } from "./ACP";
import { Product } from "../../merchants/MerchantAdapter";

export class BrowserAdapter implements ACP {
  async search(params: ACPSearchParams): Promise<Product[]> {
    throw new Error("BrowserAdapter.search not implemented yet");
  }

  async checkout(
    productId: string,
    quantity: number,
    payerAddress?: string,
    email?: string,
    resolvedAddress?: unknown
  ): Promise<ACPCheckoutResult> {
    throw new Error("BrowserAdapter.checkout not implemented yet");
  }
}