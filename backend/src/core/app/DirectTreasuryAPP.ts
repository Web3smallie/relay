// backend/src/core/app/DirectTreasuryAPP.ts
//
// Direct Treasury Payment Rail — implements direct USDC transfers
// from user Circle custodial wallets to Relay's treasury address,
// with automated CCTP liquidity bridging when necessary.
// Suitable for instant service APIs (e.g. Reloadly airtime, Duffel flights).

import { initiatePayment } from "../../agent/executePayment";
import { sendUsdcPayment } from "../../agent/sendPayment";
import { verifyUsdcPayment } from "../../agent/verifyPayment";
import { APP, AuthorizeRequest, AuthorizeResult, ExecuteResult } from "./APP";

export class DirectTreasuryAPP implements APP {
  async authorize(request: AuthorizeRequest | string): Promise<AuthorizeResult> {
    const checkoutId = typeof request === "string" ? request : request.checkoutId;
    const result = await initiatePayment(checkoutId);
    return {
      transactionId: result.transactionId,
      treasuryAddress: result.treasuryAddress,
      expectedAmount: result.expectedAmount,
      rail: "direct_treasury",
    };
  }

  async execute(
    userId: string,
    destinationAddress: string,
    amount: number
  ): Promise<ExecuteResult> {
    return sendUsdcPayment(userId, destinationAddress, amount);
  }

  async verify(payerAddress: string, amount: number): Promise<boolean> {
    return verifyUsdcPayment(payerAddress, amount);
  }
}
