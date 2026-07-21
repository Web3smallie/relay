// backend/src/core/app/APP.ts
//
// Agent Payment Protocol — the common payment interface Relay Core will
// eventually use, instead of calling initiatePayment/sendUsdcPayment/
// verifyUsdcPayment directly. This file defines the CONTRACT only.
// No existing code is changed by adding this file.

export type AuthorizeResult = {
  transactionId: string;
  treasuryAddress: string;
  expectedAmount: number;
};

export type ExecuteResult = {
  hash: string;
  payerAddress: string;
};

export interface APP {
  authorize(checkoutId: string): Promise<AuthorizeResult>;
  execute(userId: string, treasuryAddress: string, amount: number): Promise<ExecuteResult>;
  verify(payerAddress: string, amount: number): Promise<boolean>;

  // Not yet implemented anywhere — reserved for future work.
  refund?(transactionId: string): Promise<{ success: boolean }>;
}