import { bridgeUsdcForUser } from "./bridgeUsdc";

function safeStringify(obj: any) {
  return JSON.stringify(
    obj,
    (_key, value) => (typeof value === "bigint" ? value.toString() : value),
    2
  );
}

async function main() {
  const userId = process.argv[2];
  const source = process.argv[3];
  const destination = process.argv[4];
  const amount = process.argv[5];

  if (!userId || !source || !destination || !amount) {
    console.error("Usage: npx tsx src/testBridge.ts <userId> <sourceChain> <destinationChain> <amount>");
    console.error('Example: npx tsx src/testBridge.ts 7327fd25-... ARC-TESTNET ETH-SEPOLIA "5"');
    process.exit(1);
  }

  const result = await bridgeUsdcForUser(userId, source, destination, amount);
  console.log("=== BRIDGE COMPLETE ===");
  console.log(safeStringify(result));
}

main().catch((err) => {
  console.error("BRIDGE FAILED:", err);
  process.exit(1);
});