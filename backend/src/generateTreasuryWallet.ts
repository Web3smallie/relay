import { createWallet } from "./wallet";

async function main() {
  const wallet = await createWallet();
  console.log("=== RELAY TREASURY WALLET ===");
  console.log("Address:", wallet.address);
  console.log("Private Key:", wallet.privateKey);
  console.log("Mnemonic:", wallet.mnemonic);
  console.log("==============================");
  console.log("Save the address to .env as RELAY_TREASURY_ADDRESS");
  console.log("Save the private key somewhere secure (NOT in git) — you likely won't need it for the demo, but keep it safe.");
}

main();