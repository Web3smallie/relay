import { BridgeKit } from "@circle-fin/bridge-kit";
import { BridgeChain } from "@circle-fin/app-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";
import { getOrCreateChainWallet } from "./chainWallets";
import { supabaseAdmin } from "./supabaseAdmin";
import dotenv from "dotenv";

dotenv.config();

const kit = new BridgeKit();

const adapter = createCircleWalletsAdapter({
  apiKey: process.env.CIRCLE_API_KEY as string,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET as string,
});

function safeStringify(obj: any) {
  return JSON.stringify(
    obj,
    (_key, value) => (typeof value === "bigint" ? value.toString() : value),
    2
  );
}

const CHAIN_MAP: Record<string, any> = {
  "ARC-TESTNET": BridgeChain.Arc_Testnet,
  "ETH-SEPOLIA": BridgeChain.Ethereum_Sepolia,
  "ARB-SEPOLIA": BridgeChain.Arbitrum_Sepolia,
  "BASE-SEPOLIA": BridgeChain.Base_Sepolia,
  "OP-SEPOLIA": BridgeChain.Optimism_Sepolia,
  "AVAX-FUJI": BridgeChain.Avalanche_Fuji,
};

const MIN_BRIDGE_AMOUNT = 3; // CCTP's fast-transfer fee can exceed very small amounts

/**
 * Gets a user's wallet address for a given chain. Arc uses their main
 * wallet (from signup); every other chain uses/creates their per-chain
 * wallet on demand.
 */
async function getUserWalletForChain(
  userId: string,
  blockchain: string
): Promise<{ address: string; circleWalletId?: string }> {
  if (blockchain === "ARC-TESTNET") {
    const { data, error } = await supabaseAdmin
      .from("wallets")
      .select("address, circle_wallet_id")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new Error("No Arc wallet found for this user");
    }
    return { address: data.address, circleWalletId: data.circle_wallet_id };
  }

  return getOrCreateChainWallet(userId, blockchain);
}

/**
 * Bridges USDC between any two supported chains for a given user —
 * Arc to another chain, another chain back to Arc, or (in principle)
 * between two non-Arc chains, though Arc is the practical hub since
 * that's where Relay's payment engine actually spends from.
 */
export async function bridgeUsdcForUser(
  userId: string,
  sourceBlockchain: string,
  destinationBlockchain: string,
  amount: string
) {
  const sourceChain = CHAIN_MAP[sourceBlockchain];
  const destChain = CHAIN_MAP[destinationBlockchain];

  if (!sourceChain) {
    throw new Error(`Unsupported source blockchain: ${sourceBlockchain}`);
  }
  if (!destChain) {
    throw new Error(`Unsupported destination blockchain: ${destinationBlockchain}`);
  }

  const numericAmount = parseFloat(amount);
  if (numericAmount < MIN_BRIDGE_AMOUNT) {
    throw new Error(
      `Amount too small — CCTP's network fee can exceed amounts below ${MIN_BRIDGE_AMOUNT} USDC. Try a larger amount.`
    );
  }

  const sourceWallet = await getUserWalletForChain(userId, sourceBlockchain);
  const destWallet = await getUserWalletForChain(userId, destinationBlockchain);

  const estimate = await kit.estimate({
    from: { adapter, chain: sourceChain, address: sourceWallet.address },
    to: { adapter, chain: destChain, address: destWallet.address },
    amount,
    config: { transferSpeed: "FAST" },
  });

  console.log("Bridge estimate:", safeStringify(estimate));

  const result = await kit.bridge({
    from: { adapter, chain: sourceChain, address: sourceWallet.address },
    to: { adapter, chain: destChain, address: destWallet.address, useForwarder: true },
    amount,
  });

  console.log("Bridge result:", safeStringify(result));

  return result;
}