import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { supabaseAdmin } from "./supabaseAdmin";
import dotenv from "dotenv";

dotenv.config();

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY as string,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET as string,
});

const WALLET_SET_ID = process.env.CIRCLE_WALLET_SET_ID as string;

/**
 * Gets a user's existing wallet on a given chain, or creates one on
 * demand if they don't have one yet. This is how a real user gets a
 * destination wallet the first time they bridge to a new chain —
 * not pre-created for every user on every chain upfront.
 */
export async function getOrCreateChainWallet(
  userId: string,
  blockchain: string
): Promise<{ circleWalletId: string; address: string }> {
  const { data: existing } = await supabaseAdmin
    .from("user_chain_wallets")
    .select("circle_wallet_id, address")
    .eq("user_id", userId)
    .eq("blockchain", blockchain)
    .maybeSingle();

  if (existing) {
    return { circleWalletId: existing.circle_wallet_id, address: existing.address };
  }

  const response = await client.createWallets({
    walletSetId: WALLET_SET_ID,
    blockchains: [blockchain as any],
    count: 1,
  });

  const wallet = response.data?.wallets?.[0];
  if (!wallet?.id || !wallet?.address) {
    throw new Error(`Failed to create wallet on ${blockchain}`);
  }

  await supabaseAdmin.from("user_chain_wallets").insert({
    user_id: userId,
    blockchain,
    circle_wallet_id: wallet.id,
    address: wallet.address,
  });

  return { circleWalletId: wallet.id, address: wallet.address };
}