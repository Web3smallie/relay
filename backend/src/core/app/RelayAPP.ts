// backend/src/core/app/RelayAPP.ts
//
// Adapts the existing, working payment functions to the APP interface.
// This is a WRAPPER — it delegates every call straight through to the
// existing initiatePayment/sendUsdcPayment/verifyUsdcPayment functions
// with zero behavior change. None of those files are modified.

import { initiatePayment } from "../../agent/executePayment";
import { sendUsdcPayment } from "../../agent/sendPayment";
import { verifyUsdcPayment } from "../../agent/verifyPayment";
import { APP, AuthorizeResult, ExecuteResult } from "./APP";

export class RelayAPP implements APP {
  async authorize(checkoutId: string): Promise<AuthorizeResult> {
    return initiatePayment(checkoutId);
  }

  async execute(
    userId: string,
    treasuryAddress: string,
    amount: number
  ): Promise<ExecuteResult> {
    return sendUsdcPayment(userId, treasuryAddress, amount);
  }

  async verify(payerAddress: string, amount: number): Promise<boolean> {
    return verifyUsdcPayment(payerAddress, amount);
  }

  // refund intentionally left unimplemented — no refund flow exists yet.
}