// backend/src/core/app/RelayAPP.ts
//
// Multi-Rail Payment Orchestrator — routes commerce transactions to either
// ArcCommerceAPP (2-phase on-chain escrow via Commerce Payments Protocol)
// or DirectTreasuryAPP (direct transfer with CCTP auto-liquidity).

import {
  APP,
  AuthorizeRequest,
  AuthorizeResult,
  ExecuteResult,
  RailOperationResult,
} from "./APP";
import { ArcCommerceAPP } from "./ArcCommerceAPP";
import { DirectTreasuryAPP } from "./DirectTreasuryAPP";

export class RelayAPP implements APP {
  private arcCommerceRail: ArcCommerceAPP;
  private directTreasuryRail: DirectTreasuryAPP;

  constructor() {
    this.arcCommerceRail = new ArcCommerceAPP();
    this.directTreasuryRail = new DirectTreasuryAPP();
  }

  /**
   * Determine the appropriate rail for a transaction.
   * If signature is provided or rail is explicitly requested, route to ArcCommerceAPP.
   * Otherwise, route to DirectTreasuryAPP for instant execution.
   */
  private selectRail(request: AuthorizeRequest | string): APP {
    if (typeof request === "object" && request.signature) {
      return this.arcCommerceRail;
    }
    return this.directTreasuryRail;
  }

  async authorize(request: AuthorizeRequest | string): Promise<AuthorizeResult> {
    const rail = this.selectRail(request);
    return rail.authorize(request);
  }

  async execute(
    userId: string,
    destinationAddress: string,
    amount: number
  ): Promise<ExecuteResult> {
    // Direct payment rail handles wallet lookup, auto-liquidity bridging, and execution
    return this.directTreasuryRail.execute(userId, destinationAddress, amount);
  }

  async verify(payerAddress: string, amount: number): Promise<boolean> {
    return this.directTreasuryRail.verify(payerAddress, amount);
  }

  // Escrow Lifecycle Operations
  async capture(transactionId: string, amount?: number): Promise<RailOperationResult> {
    return this.arcCommerceRail.capture!(transactionId, amount);
  }

  async void(transactionId: string): Promise<RailOperationResult> {
    return this.arcCommerceRail.void!(transactionId);
  }

  async refund(transactionId: string, amount?: number): Promise<RailOperationResult> {
    return this.arcCommerceRail.refund!(transactionId, amount);
  }

  // Direct access to sub-rails when needed
  get commerceRail(): ArcCommerceAPP {
    return this.arcCommerceRail;
  }

  get treasuryRail(): DirectTreasuryAPP {
    return this.directTreasuryRail;
  }
}