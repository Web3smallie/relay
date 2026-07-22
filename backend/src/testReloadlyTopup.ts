// backend/src/testReloadlyTopup.ts
//
// Standalone test — proves the Reloadly integration works before
// wiring it into ACP or any route. Run with:
// npx tsx src/testReloadlyTopup.ts <phoneNumber> <countryIsoCode> <amount>

import { detectOperator, sendTopup } from "./merchants/ReloadlyAdapter";

async function main() {
  const [phoneNumber, countryIsoCode, amountStr] = process.argv.slice(2);

  if (!phoneNumber || !countryIsoCode || !amountStr) {
    console.error("Usage: npx tsx src/testReloadlyTopup.ts <phoneNumber> <countryIsoCode> <amount>");
    process.exit(1);
  }

  const amount = parseFloat(amountStr);

  console.log("Detecting operator...");
  const operator = await detectOperator(phoneNumber, countryIsoCode);
  console.log("Operator found:", operator.name, "| operatorId:", operator.operatorId);

  console.log("Sending top-up...");
  const result = await sendTopup(operator.operatorId, amount, countryIsoCode, phoneNumber);
  console.log("Top-up result:", result);
}

main().catch((err) => {
  console.error("Test failed:", err.message);
  process.exit(1);
});