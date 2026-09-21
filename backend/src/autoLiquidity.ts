import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { bridgeUsdcForUser } from "./bridgeUsdc";
import { supabaseAdmin } from "./supabaseAdmin";
import dotenv from "dotenv";

dotenv.config();

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY as string,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET as string,
});

const OTHER_CHAINS = ["ETH-SEPOLIA", "ARB-SEPOLIA", "BASE-SEPOLIA", "OP-SEPOLIA", "AVAX-FUJI"];

const MIN_BRIDGE_AMOUNT = 3; // matches bridgeUsdc.ts's own CCTP minimum
const SAFETY_BUFFER = 0.5; // small margin for Arc-side transaction costs

// PAY-04 fix: after a bridge completes we poll the Arc wallet balance until
// the bridged USDC actually arrives. CCTP fast-transfer typically settles in
// 10-30 seconds; we wait up to 3 minutes before giving up.
const BRIDGE_SETTLE_POLL_MS = 5000; // check every 5 seconds
const BRIDGE_SETTLE_TIMEOUT_MS = 180_000; // 3 minutes max

async function getBalances(circleWalletId: string): Promise<{ usdc: number; native: number }> {
  const response = await client.getWalletTokenBalance({ id: circleWalletId });
  const balances = response.data?.tokenBalances || [];

  const usdcToken = balances.find((b: any) => b.token.symbol === "USDC" && !b.token.isNative);
  const nativeToken = balances.find((b: any) => b.token.isNative);

  return {
    usdc: usdcToken ? parseFloat(usdcToken.amount) : 0,
    native: nativeToken ? parseFloat(nativeToken.amount) : 0,
  };
}

/**
 * Polls the Arc wallet balance until it reaches or exceeds `targetUsdc`,
 * or until `timeoutMs` has elapsed. Returns the final USDC balance.
 *
 * This resolves the PAY-04 race condition where Relay called `sendUsdcPayment`
 * immediately after `bridgeUsdcForUser` returned — before CCTP had actually
 * delivered the funds to the Arc wallet, causing the payment to fail with
 * "insufficient balance".
 */
async function waitForArcBalance(
  arcCircleWalletId: string,
  targetUsdc: number,
  timeoutMs = BRIDGE_SETTLE_TIMEOUT_MS
): Promise<number> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { usdc } = await getBalances(arcCircleWalletId);
    console.log(`[ensureArcLiquidity] Arc balance poll: ${usdc} USDC (need ${targetUsdc})`);

    if (usdc >= targetUsdc) {
      return usdc;
    }

    await new Promise((resolve) => setTimeout(resolve, BRIDGE_SETTLE_POLL_MS));
  }

  const { usdc: finalBalance } = await getBalances(arcCircleWalletId);
  if (finalBalance >= targetUsdc) {
    return finalBalance;
  }

  throw new Error(
    `CCTP bridge timed out: Arc balance is ${finalBalance} USDC after ${timeoutMs / 1000}s, ` +
    `but ${targetUsdc} USDC is required. The bridge may still be in flight — try again in a moment.`
  );
}

export type LiquidityResult =
  | { bridged: false }
  | { bridged: true; fromChain: string; amountBridged: number };

/**
 * Checks whether the user's Arc wallet has enough USDC for a purchase.
 * If not, looks across their other-chain wallets for one with enough
 * USDC AND its own native gas already funded, bridges the shortfall
 * into Arc via CCTP, and WAITS for the bridged USDC to arrive before
 * returning.
 *
 * PAY-04 fix: previously this function returned immediately after calling
 * bridgeUsdcForUser(), before CCTP had settled. Payment would then fail
 * because the Arc balance hadn't updated yet. Now we poll the Arc balance
 * until the required amount is confirmed, with a 3-minute timeout and a
 * clear error if settlement doesn't arrive in time.
 */
export async function ensureArcLiquidity(
  userId: string,
  arcCircleWalletId: string,
  requiredAmount: number
): Promise<LiquidityResult> {
  const arcBalances = await getBalances(arcCircleWalletId);

  if (arcBalances.usdc >= requiredAmount) {
    return { bridged: false };
  }

  const rawShortfall = requiredAmount + SAFETY_BUFFER - arcBalances.usdc;
  const shortfall = Math.max(rawShortfall, MIN_BRIDGE_AMOUNT);

  const { data: otherWallets } = await supabaseAdmin
    .from("user_chain_wallets")
    .select("blockchain, circle_wallet_id, address")
    .eq("user_id", userId)
    .in("blockchain", OTHER_CHAINS);

  if (!otherWallets || otherWallets.length === 0) {
    throw new Error(
      `Insufficient USDC on Arc (have ${arcBalances.usdc}, need ${requiredAmount}) and no other-chain wallets found to bridge from.`
    );
  }

  for (const wallet of otherWallets) {
    const balances = await getBalances(wallet.circle_wallet_id);

    if (balances.usdc < shortfall) {
      continue; // not enough USDC on this chain, try the next
    }

    if (balances.native <= 0) {
      throw new Error(
        `Found ${balances.usdc} USDC on ${wallet.blockchain}, but that wallet (${wallet.address}) has no native gas to bridge with. Fund it with testnet gas and try again.`
      );
    }

    console.log(`[ensureArcLiquidity] Auto-bridging ${shortfall} USDC from ${wallet.blockchain} to Arc for user ${userId}`);

    await bridgeUsdcForUser(userId, wallet.blockchain, "ARC-TESTNET", shortfall.toString());

    // PAY-04 fix: wait for the bridged USDC to land on Arc before returning.
    // bridgeUsdcForUser() returns when the bridge TX is submitted, not when
    // CCTP has delivered the funds. We poll here to confirm arrival.
    console.log(`[ensureArcLiquidity] Bridge submitted. Waiting for USDC to arrive on Arc...`);
    await waitForArcBalance(arcCircleWalletId, requiredAmount);
    console.log(`[ensureArcLiquidity] Arc balance confirmed sufficient. Proceeding to payment.`);

    return { bridged: true, fromChain: wallet.blockchain, amountBridged: shortfall };
  }

  throw new Error(
    `Insufficient USDC on Arc (have ${arcBalances.usdc}, need ${requiredAmount}), and no other chain has at least ${shortfall} USDC available to bridge.`
  );
}
