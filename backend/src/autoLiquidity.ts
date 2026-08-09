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

export type LiquidityResult =
  | { bridged: false }
  | { bridged: true; fromChain: string; amountBridged: number };

/**
 * Checks whether the user's Arc wallet has enough USDC for a purchase.
 * If not, looks across their other-chain wallets for one with enough
 * USDC AND its own native gas already funded, bridges the shortfall
 * into Arc via CCTP, and waits for it to complete before returning.
 *
 * Does NOT sponsor gas from Relay's treasury — a source wallet lacking
 * its own native gas is a documented limitation, not something this
 * function works around. See Stage 3 (not yet built) for that.
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

    console.log(`Auto-bridging ${shortfall} USDC from ${wallet.blockchain} to Arc for user ${userId}`);

    await bridgeUsdcForUser(userId, wallet.blockchain, "ARC-TESTNET", shortfall.toString());

    return { bridged: true, fromChain: wallet.blockchain, amountBridged: shortfall };
  }

  throw new Error(
    `Insufficient USDC on Arc (have ${arcBalances.usdc}, need ${requiredAmount}), and no other chain has at least ${shortfall} USDC available to bridge.`
  );
}