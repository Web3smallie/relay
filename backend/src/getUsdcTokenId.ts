import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import dotenv from "dotenv";

dotenv.config();

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY as string,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET as string,
});

async function main() {
  const walletId = process.argv[2];
  if (!walletId) {
    console.error("Usage: npx tsx src/getUsdcTokenId.ts <circleWalletId>");
    process.exit(1);
  }

  const response = await client.getWalletTokenBalance({ id: walletId });
  console.log(JSON.stringify(response.data, null, 2));
}

main();