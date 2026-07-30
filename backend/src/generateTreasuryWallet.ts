import { createWallet } from "./wallet";

async function main() {
  const wallet = await createWallet();
  console.log("=== RELAY TREASURY WALLET ===");
  console.log("Address:", wallet.address);
  console.log("Circle Wallet ID:", wallet.circleWalletId);
  console.log("==============================");
  console.log("Save the address to .env as RELAY_TREASURY_ADDRESS");
  console.log("Save the Circle Wallet ID to .env as RELAY_TREASURY_CIRCLE_WALLET_ID");
  console.log("(Circle holds the private key — nothing else to store securely.)");
}

main();