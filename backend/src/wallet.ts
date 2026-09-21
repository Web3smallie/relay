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
 * Creates a new Circle-custodied wallet for a user on Arc Testnet.
 *
 * Account type: SCA (Smart Contract Account) — required for Circle Gas Station
 * to sponsor Arc gas on behalf of the user. Gas Station is pre-configured on
 * Arc Testnet (50 USDC/day limit, auto-applied by Circle once the policy is
 * active). With SCA wallets, users need zero native gas to transact — Relay's
 * Gas Station policy covers it automatically.
 *
 * CCTP source wallets remain EOA (see createCctpFundingWallets) and require
 * native gas on each source chain to submit the USDC burn transaction.
 */
export async function createWallet() {
  const response = await client.createWallets({
    walletSetId: WALLET_SET_ID,
    blockchains: ["ARC-TESTNET"],
    accountType: "SCA", // SCA enables Circle Gas Station sponsorship on Arc
    count: 1,
  });

  const wallet = response.data?.wallets?.[0];

  if (!wallet) {
    throw new Error("Circle did not return a wallet");
  }

  return {
    circleWalletId: wallet.id,
    address: wallet.address,
    accountType: (wallet as any).accountType ?? "SCA",
  };
}

/**
 * Looks up the account type of an existing Circle wallet.
 * Returns "SCA", "EOA", or "UNKNOWN" if the field is absent.
 * Used by sendFromWallet to decide whether Gas Station applies.
 */
export async function getWalletAccountType(circleWalletId: string): Promise<string> {
  try {
    const response = await client.getWallet({ id: circleWalletId });
    return (response.data?.wallet as any)?.accountType ?? "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

/**
 * Creates all CCTP funding wallets in one EVM batch. Circle assigns the same
 * address across the chains in this batch, giving each new user one CCTP
 * funding address for all supported EVM testnets.
 *
 * Account type: EOA — source-chain CCTP wallets must hold native gas to submit
 * the USDC burn transaction on each source chain. autoLiquidity.ts enforces
 * this via a native-balance guard before attempting the bridge.
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
