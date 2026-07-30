// backend/src/createWalletSet.ts
//
// One-time setup script — creates a Circle Wallet Set, the container
// all of Relay's user wallets will live inside. Run once, save the
// resulting walletSetId into .env, then this file isn't needed again.
//
// Run with: npx tsx src/createWalletSet.ts

import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import dotenv from "dotenv";

dotenv.config();

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY as string,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET as string,
});

async function main() {
  const response = await client.createWalletSet({
    name: "Relay User Wallets",
  });

  console.log("Wallet Set created:");
  console.log(response.data);
}

main().catch((err) => {
  console.error("Failed to create wallet set:", err);
  process.exit(1);
});