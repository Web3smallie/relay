// backend/src/core/app/APP.ts
//
// Agent Payment Protocol — the common payment interface Relay Core uses
// to support multiple payment rails (On-chain Escrow via Commerce Payments Protocol,
// Direct Treasury Transfer, CCTP, etc.).

import type { PaymentInfo } from "./protocolTypes";

export type AuthorizeRequest = {
  checkoutId: string;
  userId?: string;
  payerAddress?: string;
  merchantReceiverAddress?: string;
  amount?: number;
  currency?: "USDC" | "EURC";
  signature?: string; // Off-chain ERC-3009 signature if pre-signed
};

export type AuthorizeResult = {
  transactionId: string;
  treasuryAddress: string;
  expectedAmount: number;
  rail: "arc_commerce_escrow" | "direct_treasury";
  paymentInfo?: PaymentInfo;
  paymentHash?: string;
  nonce?: string;
};

export type ExecuteResult = {
  hash: string;
  payerAddress: string;
  liquidity: {
    bridged: boolean;
    fromChain?: string;
    amountBridged?: number;
  };
};

export type RailOperationResult = {
  success: boolean;
  hash: string;
  status: string;
  amount?: number;
};

export interface APP {
  authorize(request: AuthorizeRequest | string): Promise<AuthorizeResult>;
  execute(userId: string, destinationAddress: string, amount: number): Promise<ExecuteResult>;
  verify(payerAddress: string, amount: number): Promise<boolean>;

  // Escrow & Lifecycle Operations
  capture?(transactionId: string, amount?: number): Promise<RailOperationResult>;
  void?(transactionId: string): Promise<RailOperationResult>;
  refund?(transactionId: string, amount?: number): Promise<RailOperationResult>;
  reclaim?(transactionId: string): Promise<RailOperationResult>;
}
