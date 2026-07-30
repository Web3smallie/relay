// backend/src/registerEntitySecret.ts
//
// One-time step: registers your entity secret with Circle by encrypting
// it with Circle's public key and submitting the ciphertext. Run once.
//
// Run with: npx tsx src/registerEntitySecret.ts

import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const response = await registerEntitySecretCiphertext({
    apiKey: process.env.CIRCLE_API_KEY as string,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET as string,
  });

  console.log("Entity secret registered:");
  console.log(response.data);
  console.log("\nIMPORTANT: save the recovery file it gives you somewhere safe.");
}

main().catch((err) => {
  console.error("Failed to register entity secret:", err);
  process.exit(1);
});