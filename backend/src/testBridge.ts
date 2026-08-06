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
  const destination = process.argv[3];
  const amount = process.argv[4];

  if (!userId || !destination || !amount) {
    console.error("Usage: npx tsx src/testBridge.ts <userId> <destinationChain> <amount>");
    console.error('Example: npx tsx src/testBridge.ts 7327fd25-... ETH-SEPOLIA "5"');
    process.exit(1);
  }

  const result = await bridgeUsdcForUser(userId, destination, amount);
  console.log("=== BRIDGE COMPLETE ===");
  console.log(safeStringify(result));
}

main().catch((err) => {
  console.error("BRIDGE FAILED:", err);
  process.exit(1);
});