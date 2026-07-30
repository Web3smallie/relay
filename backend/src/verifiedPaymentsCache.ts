// Simple in-memory cache mapping a Saleor transaction ID to a payment
// already confirmed via Circle in /agent/pay. Lets saleorPayment.ts's
// webhook skip the slow on-chain log scan when we already know, from
// our own synchronous Circle poll, that the payment succeeded.
//
// This is a fast path, not the only path — if a transaction isn't found
// here (e.g. after a server restart), the webhook falls back to the
// original blockchain-scan verification, so nothing breaks.

type VerifiedPayment = {
  payerAddress: string;
  hash: string;
  amount: number;
};

const cache = new Map<string, VerifiedPayment>();

export function markPaymentVerified(saleorTransactionId: string, payment: VerifiedPayment) {
  cache.set(saleorTransactionId, payment);
}

export function getVerifiedPayment(saleorTransactionId: string): VerifiedPayment | undefined {
  return cache.get(saleorTransactionId);
}

export function clearVerifiedPayment(saleorTransactionId: string) {
  cache.delete(saleorTransactionId);
}