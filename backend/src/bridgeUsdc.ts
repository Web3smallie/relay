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

export async function bridgeUsdcForUser(
  userId: string,
  destinationBlockchain: string,
  amount: string
) {
  const { data: sourceWallet, error } = await supabaseAdmin
    .from("wallets")
    .select("address")
    .eq("user_id", userId)
    .single();

  if (error || !sourceWallet) {
    throw new Error("No Arc wallet found for this user");
  }

  const destWallet = await getOrCreateChainWallet(userId, destinationBlockchain);

  const sourceChain = CHAIN_MAP["ARC-TESTNET"];
  const destChain = CHAIN_MAP[destinationBlockchain];

  if (!destChain) {
    throw new Error(`Unsupported destination blockchain: ${destinationBlockchain}`);
  }


  if (!destChain) {
    throw new Error(`Unsupported destination blockchain: ${destinationBlockchain}`);
  }

  const numericAmount = parseFloat(amount);
  const MIN_BRIDGE_AMOUNT = 3; // CCTP's fast-transfer fee can exceed very small amounts

  if (numericAmount < MIN_BRIDGE_AMOUNT) {
    throw new Error(
      `Amount too small — CCTP's network fee can exceed amounts below ${MIN_BRIDGE_AMOUNT} USDC. Try a larger amount.`
    );
  }
  
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