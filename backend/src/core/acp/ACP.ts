// backend/src/core/acp/ACP.ts
//
// Agent Commerce Protocol — the common commerce interface every merchant
// adapter will eventually implement. This file defines the CONTRACT only.
// No existing code is changed by adding this file.

import { Product } from "../../merchants/MerchantAdapter";

export type ACPSearchParams = {
  query: string;
  maxPrice?: number;
};

export type ACPCheckoutResult = {
  checkoutId: string;
  totalPrice?: number | null;
};

export type ACPReview = {
  source: string;
  rating: number;
  verified: boolean;
};

export type ACPOrderStatus = {
  orderId: string;
  status: string;
};

// Every method beyond search/checkout is OPTIONAL at this stage — most
// merchant adapters (including Saleor today) don't support them yet.
// Marking them optional means SaleorAdapter can conform to ACP right now
// without needing to implement anything it doesn't already do.
export interface ACP {
  search(params: ACPSearchParams): Promise<Product[]>;
  checkout(
    productId: string,
    quantity: number,
    payerAddress?: string,
    email?: string,
    resolvedAddress?: unknown
  ): Promise<ACPCheckoutResult>;

  compare?(productIds: string[]): Promise<Product[]>;
  authenticateReviews?(productId: string): Promise<ACPReview[]>;
  track?(orderId: string): Promise<ACPOrderStatus>;
  cancel?(orderId: string): Promise<{ success: boolean }>;
  refund?(orderId: string): Promise<{ success: boolean }>;
}