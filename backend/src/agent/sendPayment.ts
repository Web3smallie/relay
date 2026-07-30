import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { supabaseAdmin } from "../supabaseAdmin";
import dotenv from "dotenv";

dotenv.config();

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY as string,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET as string,
});

const USDC_TOKEN_ADDRESS = process.env.USDC_CONTRACT_ADDRESS as string; // 0x3600...0000 on Arc

/**
 * Core send function — works for ANY Circle-managed wallet, given its
 * walletId directly. Used by both customer payments and treasury-
 * initiated sends (refunds, fronting an A2MCP purchase).
 */

const USDC_NATIVE_TOKEN_ID = process.env.USDC_TOKEN_ID as string;

async function sendFromWallet(
  circleWalletId: string,
  destinationAddress: string,
  amount: number
): Promise<{ hash: string }> {
  let txResponse;
  try {
    txResponse = await client.createTransaction({
      walletId: circleWalletId,
      tokenId: USDC_NATIVE_TOKEN_ID,
      destinationAddress,
      amount: [amount.toString()],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });
  } catch (err: any) {
    console.error("Circle createTransaction FAILED. Full error:");
    console.error(JSON.stringify(err, null, 2));
    console.error("err.response?.data:", err?.response?.data);
    throw err;
  }

  console.log("Circle createTransaction raw response:", JSON.stringify(txResponse.data, null, 2));

  const transactionId = txResponse.data?.id;
  if (!transactionId) {
    throw new Error("Circle did not return a transaction id");
  }

  const hash = await pollForTransactionHash(transactionId);
  return { hash };
}

/**
 * Sends a real USDC payment from a CUSTOMER's Circle-custodied wallet
 * (looked up by userId) to the given treasury address. This is the
 * existing customer-purchase flow, unchanged in behavior.
 */
export async function sendUsdcPayment(
  userId: string,
  treasuryAddress: string,
  amount: number
): Promise<{ hash: string; payerAddress: string }> {
  const { data: walletRow, error } = await supabaseAdmin
    .from("wallets")
    .select("address, circle_wallet_id")
    .eq("user_id", userId)
    .single();

  if (error || !walletRow) {
    throw new Error("No wallet found for this user");
  }

  const { hash } = await sendFromWallet(walletRow.circle_wallet_id, treasuryAddress, amount);
  return { hash, payerAddress: walletRow.address };
}

/**
 * Sends a real USDC payment FROM Relay's own treasury wallet — used for
 * refunds, or for fronting a purchase on a customer/agent's behalf (the
 * A2MCP pattern, where the caller pays Relay a fee via x402 and Relay
 * covers the actual merchant purchase from its own treasury balance).
 */
export async function sendFromTreasury(
  destinationAddress: string,
  amount: number
): Promise<{ hash: string; payerAddress: string }> {
  const treasuryCircleWalletId = process.env.RELAY_TREASURY_CIRCLE_WALLET_ID as string;
  const treasuryAddress = process.env.RELAY_TREASURY_ADDRESS as string;

  if (!treasuryCircleWalletId) {
    throw new Error("RELAY_TREASURY_CIRCLE_WALLET_ID is not set in .env");
  }

  const { hash } = await sendFromWallet(treasuryCircleWalletId, destinationAddress, amount);
  return { hash, payerAddress: treasuryAddress };
}

async function pollForTransactionHash(
  transactionId: string,
  maxAttempts = 20,
  delayMs = 2000
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await client.getTransaction({ id: transactionId });
    const tx = response.data?.transaction;

    console.log(`Poll attempt ${i + 1}, transaction state:`, tx?.state);

    if (tx?.txHash) {
      return tx.txHash;
    }

    if (tx?.state === "FAILED" || tx?.state === "CANCELLED" || tx?.state === "DENIED") {
      throw new Error(`Transaction failed with state: ${tx.state}`);
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("Timed out waiting for transaction to confirm");
}