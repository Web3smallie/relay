import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import dotenv from "dotenv";

dotenv.config();

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY as string,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET as string,
});

const WALLET_SET_ID = process.env.CIRCLE_WALLET_SET_ID as string;

async function main() {
  const blockchain = process.argv[2];
  if (!blockchain) {
    console.error("Usage: npx tsx src/createChainWallet.ts <BLOCKCHAIN_ID>");
    console.error("Example: npx tsx src/createChainWallet.ts ARB-SEPOLIA");
    process.exit(1);
  }

  const response = await client.createWallets({
    walletSetId: WALLET_SET_ID,
    blockchains: [blockchain as any],
    count: 1,
  });

  const wallet = response.data?.wallets?.[0];
  console.log(`Wallet created on ${blockchain}:`);
  console.log("Address:", wallet?.address);
  console.log("Circle Wallet ID:", wallet?.id);
}

main().catch(console.error);