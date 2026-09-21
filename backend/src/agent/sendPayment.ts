import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { supabaseAdmin } from "../supabaseAdmin";
import { ensureArcLiquidity } from "../autoLiquidity";
import { getWalletAccountType } from "../wallet";
import dotenv from "dotenv";

dotenv.config();

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY as string,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET as string,
});

const USDC_NATIVE_TOKEN_ID = process.env.USDC_TOKEN_ID as string;

/**
 * Core send function — works for any Circle-managed wallet given its walletId.
 *
 * Gas Station (MOD-5): Gas Station sponsorship is AUTOMATIC for SCA wallets
 * when a Gas Station policy is active on the Circle account. No code change
 * is required per-transaction — Circle intercepts the user operation and pays
 * the gas. The fee field below specifies the gas pricing strategy, but the
 * actual payment of gas is sponsored by Circle's paymaster contract, so the
 * wallet needs zero native USDC for gas.
 *
 * For new users (SCA wallets, created via MOD-5 wallet.ts change), gas is
 * sponsored automatically. For legacy EOA wallets, the wallet must hold native
 * USDC for gas as before.
 */
async function sendFromWallet(
  circleWalletId: string,
  destinationAddress: string,
  amount: number
): Promise<{ hash: string; gasSponsored: boolean }> {
  const accountType = await getWalletAccountType(circleWalletId);
  const isSca = accountType === "SCA";

  console.log(
    `[sendFromWallet] walletId=${circleWalletId}, accountType=${accountType}, ` +
    `gasSponsored=${isSca} (Gas Station auto-applies for SCA wallets when policy is active)`
  );

  let txResponse;
  try {
    txResponse = await client.createTransaction({
      walletId: circleWalletId,
      tokenId: USDC_NATIVE_TOKEN_ID,
      destinationAddress,
      amount: [amount.toString()],
      // Fee field is always required by the Circle DCW SDK. For SCA wallets with
      // an active Gas Station policy, Circle's paymaster covers the actual cost
      // — the developer (Relay) pays via their Circle account, not the user.
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
  return { hash, gasSponsored: isSca };
}

/**
 * Sends a real USDC payment from a CUSTOMER's Circle-custodied wallet
 * (looked up by userId) to the given treasury address.
 *
 * PAY-04 fix: ensureArcLiquidity now waits for bridged USDC to arrive on Arc
 * before this function proceeds to the actual transfer.
 */
export async function sendUsdcPayment(
  userId: string,
  treasuryAddress: string,
  amount: number
): Promise<{
  hash: string;
  payerAddress: string;
  gasSponsored: boolean;
  liquidity: { bridged: boolean; fromChain?: string; amountBridged?: number };
}> {
  const { data: walletRow, error } = await supabaseAdmin
    .from("wallets")
    .select("address, circle_wallet_id")
    .eq("user_id", userId)
    .single();

  if (error || !walletRow) {
    throw new Error("No wallet found for this user");
  }

  const liquidity = await ensureArcLiquidity(userId, walletRow.circle_wallet_id, amount);

  const { hash, gasSponsored } = await sendFromWallet(walletRow.circle_wallet_id, treasuryAddress, amount);
  return { hash, payerAddress: walletRow.address, gasSponsored, liquidity };
}

/**
 * Sends a real USDC payment FROM Relay's own treasury wallet — used for
 * refunds or fronting a purchase on a customer/agent's behalf.
 */
export async function sendFromTreasury(
  destinationAddress: string,
  amount: number
): Promise<{
  hash: string;
  payerAddress: string;
  gasSponsored: boolean;
  liquidity: { bridged: boolean; fromChain?: string; amountBridged?: number };
}> {
  const treasuryCircleWalletId = process.env.RELAY_TREASURY_CIRCLE_WALLET_ID as string;
  const treasuryAddress = process.env.RELAY_TREASURY_ADDRESS as string;

  if (!treasuryCircleWalletId) {
    throw new Error("RELAY_TREASURY_CIRCLE_WALLET_ID is not set in .env");
  }

  const { hash, gasSponsored } = await sendFromWallet(treasuryCircleWalletId, destinationAddress, amount);
  return { hash, payerAddress: treasuryAddress, gasSponsored, liquidity: { bridged: false } };
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
