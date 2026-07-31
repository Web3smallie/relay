import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import dotenv from "dotenv";

dotenv.config();

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY as string,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET as string,
});

const CONTRACT_ADDRESS = process.env.RELAY_RECEIPT_CONTRACT_ADDRESS as string;
const TREASURY_WALLET_ID = process.env.RELAY_TREASURY_CIRCLE_WALLET_ID as string;

/**
 * Mints a receipt NFT to the buyer's wallet after a completed purchase.
 * The token's metadata is embedded directly as a base64 data URI — no
 * external hosting (IPFS, etc.) needed for this to work.
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

  const transactionId = response.data?.id;
  if (!transactionId) {
    throw new Error("Circle did not return a transaction id for the mint");
  }

  return { hash: transactionId };
}