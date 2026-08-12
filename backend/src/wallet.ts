import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import dotenv from "dotenv";

dotenv.config();

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY as string,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET as string,
});

const WALLET_SET_ID = process.env.CIRCLE_WALLET_SET_ID as string;

export const CCTP_FUNDING_CHAINS = [
  "ETH-SEPOLIA",
  "ARB-SEPOLIA",
  "BASE-SEPOLIA",
  "OP-SEPOLIA",
  "AVAX-FUJI",
] as const;

/**
 * Creates a new Circle-custodied wallet for a user on Arc Testnet. Circle
 * holds and manages the private key entirely — Relay never generates,
 * sees, or stores a raw private key or mnemonic anymore.
 */
export async function createWallet() {
  const response = await client.createWallets({
    walletSetId: WALLET_SET_ID,
    blockchains: ["ARC-TESTNET"],
    accountType: "SCA",
    count: 1,
  });

  const wallet = response.data?.wallets?.[0];

  if (!wallet) {
    throw new Error("Circle did not return a wallet");
  }

  return {
    circleWalletId: wallet.id,
    address: wallet.address,
  };
}

/**
 * Creates all CCTP funding wallets in one EVM batch. Circle assigns the same
 * address across the chains in this batch, giving each new user one CCTP
 * funding address for all supported EVM testnets.
 */
export async function createCctpFundingWallets(userId: string) {
  const response = await client.createWallets({
    walletSetId: WALLET_SET_ID,
    blockchains: [...CCTP_FUNDING_CHAINS],
    accountType: "EOA",
    count: 1,
    metadata: [{ refId: userId, name: "Relay CCTP funding wallets" }],
  });

  const wallets = response.data?.wallets ?? [];
  if (wallets.length !== CCTP_FUNDING_CHAINS.length) {
    throw new Error("Circle did not create every CCTP funding wallet");
  }

  return wallets.map((wallet) => ({
    blockchain: wallet.blockchain,
    circleWalletId: wallet.id,
    address: wallet.address,
  }));
}
