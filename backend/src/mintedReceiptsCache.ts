// Tracks whether a receipt NFT has been minted for a given checkout,
// so the frontend can poll and show it once minting completes
// (minting happens asynchronously, after /agent/pay already returned).

type MintedReceipt = {
  contractAddress: string;
  transactionHash: string;
  mintedAt: string;
};

const cache = new Map<string, MintedReceipt>();

export function markReceiptMinted(checkoutId: string, receipt: MintedReceipt) {
  cache.set(checkoutId, receipt);
}

export function getMintedReceipt(checkoutId: string): MintedReceipt | undefined {
  return cache.get(checkoutId);
}