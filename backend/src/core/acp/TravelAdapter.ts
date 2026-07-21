// backend/src/core/acp/TravelAdapter.ts
//
// Placeholder for future travel commerce (flights, hotels, etc.).
// No implementation yet.

import { ACP, ACPSearchParams, ACPCheckoutResult } from "./ACP";
import { Product } from "../../merchants/MerchantAdapter";

export class TravelAdapter implements ACP {
  async search(params: ACPSearchParams): Promise<Product[]> {
    throw new Error("TravelAdapter.search not implemented yet");
  }

  async checkout(
    productId: string,
    quantity: number,
    payerAddress?: string,
    email?: string,
    resolvedAddress?: unknown
  ): Promise<ACPCheckoutResult> {
    throw new Error("TravelAdapter.checkout not implemented yet");
  }
}