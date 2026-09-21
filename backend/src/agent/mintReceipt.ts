import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import dotenv from "dotenv";

dotenv.config();

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY as string,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET as string,
});

const CONTRACT_ADDRESS = process.env.RELAY_RECEIPT_CONTRACT_ADDRESS as string;
const TREASURY_WALLET_ID = process.env.RELAY_TREASURY_CIRCLE_WALLET_ID as string;

const POLL_DELAY_MS = 2000;
const MAX_POLL_ATTEMPTS = 30; // up to 60 seconds

/**
 * Polls a Circle transaction until it has a real on-chain txHash or reaches
 * a terminal failed state. Returns the blockchain transaction hash.
 *
 * BC-05 fix: previously mintReceipt returned Circle's internal operation UUID,
 * which is NOT a blockchain hash and produces 404 links on ArcScan. This
 * function waits for the transaction to be mined and returns the actual hash.
 */
async function pollForTxHash(circleOperationId: string): Promise<string> {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const response = await client.getTransaction({ id: circleOperationId });
    const tx = response.data?.transaction;

    console.log(`[mintReceipt] Poll attempt ${i + 1}, state: ${tx?.state}, txHash: ${tx?.txHash ?? "pending"}`);

    if (tx?.txHash) {
      return tx.txHash;
    }

    if (tx?.state === "FAILED" || tx?.state === "CANCELLED" || tx?.state === "DENIED") {
      throw new Error(`Receipt mint transaction reached terminal state: ${tx.state}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
  }

  throw new Error(
    `Receipt mint timed out waiting for on-chain confirmation after ${MAX_POLL_ATTEMPTS * POLL_DELAY_MS / 1000}s`
  );
}

/**
 * Mints a receipt NFT to the buyer's wallet after a completed purchase.
 * The token's metadata is embedded directly as a base64 data URI — no
 * external hosting (IPFS, etc.) needed for this to work.
 *
 * Returns the REAL blockchain transaction hash (not Circle's internal ID),
 * so the ArcScan explorer link in the frontend is always valid.
 */
export async function mintReceipt(
  buyerAddress: string,
  orderDetails: { orderNumber: string; product: string; amount: number; currency: string }
): Promise<{ hash: string }> {
  const metadata = {
    name: `Relay Receipt #${orderDetails.orderNumber}`,
    description: `Proof of purchase — ${orderDetails.product}`,
    attributes: [
      { trait_type: "Order Number", value: orderDetails.orderNumber },
      { trait_type: "Product", value: orderDetails.product },
      { trait_type: "Amount", value: `${orderDetails.amount} ${orderDetails.currency}` },
      { trait_type: "Date", value: new Date().toISOString() },
    ],
  };

  const tokenURI = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString("base64")}`;

  const response = await client.createContractExecutionTransaction({
    walletId: TREASURY_WALLET_ID,
    abiFunctionSignature: "mintTo(address,string)",
    abiParameters: [buyerAddress, tokenURI],
    contractAddress: CONTRACT_ADDRESS,
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });

  console.log("Receipt mint transaction created:", JSON.stringify(response.data, null, 2));

  const circleOperationId = response.data?.id;
  if (!circleOperationId) {
    throw new Error("Circle did not return a transaction id for the mint");
  }

  // Poll until the transaction is mined and we have a real blockchain hash.
  // This replaces the previous behaviour of returning the Circle operation UUID
  // (which is NOT an on-chain hash and produces broken ArcScan links).
  const txHash = await pollForTxHash(circleOperationId);
  console.log(`[mintReceipt] Minted to ${buyerAddress}, txHash: ${txHash}`);

  return { hash: txHash };
}
