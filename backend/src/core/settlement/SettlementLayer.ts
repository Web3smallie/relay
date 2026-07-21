// backend/src/core/settlement/SettlementLayer.ts
//
// Placeholder for future settlement integrations (Bridge, Stripe, Circle,
// Coinbase Commerce, BVNK, USDC→Fiat conversion, etc.). This defines only
// the SHAPE of a future settlement layer — no real implementation exists
// yet, and nothing calls this today. Added so future integrations have a
// clear, consistent interface to build against.

export type SettlementRequest = {
  amount: number;
  currency: string;
  destination: string;
};

export type SettlementResult = {
  success: boolean;
  reference: string;
};

export interface SettlementLayer {
  settle(request: SettlementRequest): Promise<SettlementResult>;
}

// No concrete implementation yet — this is intentionally left as an
// interface only. A real settlement provider integration (e.g. Circle's
// API for USDC→Fiat) would implement this interface in a future phase.