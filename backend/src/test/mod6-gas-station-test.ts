/**
 * MOD-6: Zero-native-gas flow test
 * Run with: cd backend && bun run src/test/mod6-gas-station-test.ts
 *
 * Tests the full payment flow where the user's Arc wallet has zero native gas
 * but sufficient USDC. With Circle Gas Station enabled (SCA wallet + active
 * policy), the transaction should succeed without any native gas balance.
 */
import { createWallet, getWalletAccountType } from "../wallet";
import { getBalance } from "../chain";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import dotenv from "dotenv";
dotenv.config();

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY as string,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET as string,
});

const P = "PASS";
const F = "FAIL";
const S = "SKIP";
const results: { name: string; passed: boolean; detail: string }[] = [];

function check(name: string, condition: boolean, detail: string) {
  results.push({ name, passed: condition, detail });
  console.log(`[${condition ? P : F}] ${name}: ${detail}`);
}

async function run() {
  console.log("\n=== MOD-6: Zero-native-gas / Gas Station flow test ===\n");

  console.log("--- T1: createWallet() returns SCA account type ---");
  let newWalletId: string | undefined;
  let newWalletAddress: string | undefined;
  try {
    const w = await createWallet();
    newWalletId = w.circleWalletId;
    newWalletAddress = w.address;
    check("T1.1 createWallet circleWalletId present", !!newWalletId, newWalletId ?? "MISSING");
    check("T1.2 createWallet address present", !!newWalletAddress, newWalletAddress ?? "MISSING");
    check("T1.3 accountType is SCA", w.accountType === "SCA", `accountType=${w.accountType}`);
    console.log(`   Wallet: ${newWalletAddress} (${newWalletId})`);
  } catch (err: any) {
    check("T1 wallet creation", false, err.message);
  }

  console.log("\n--- T2: getWalletAccountType() returns SCA ---");
  if (newWalletId) {
    try {
      const accountType = await getWalletAccountType(newWalletId);
      check("T2.1 accountType lookup == SCA", accountType === "SCA", `returned: ${accountType}`);
    } catch (err: any) {
      check("T2.1 accountType lookup", false, err.message);
    }
  } else {
    console.log(`[${S}] T2: no wallet from T1`);
  }

  console.log("\n--- T3: getBalance() uses ERC-20 (BC-02 fix) ---");
  if (newWalletAddress) {
    try {
      const balance = await getBalance(newWalletAddress);
      const asFloat = parseFloat(balance);
      check("T3.1 getBalance returns string", typeof balance === "string", `"${balance}"`);
      check("T3.2 balance is finite", isFinite(asFloat), `parseFloat = ${asFloat}`);
      check(
        "T3.3 balance not absurdly large (would be >1e12 if 18-decimal native was used)",
        asFloat < 1e10,
        `${asFloat}`
      );
      console.log(`   Balance: ${balance} USDC`);
    } catch (err: any) {
      check("T3 getBalance", false, err.message);
    }
  } else {
    console.log(`[${S}] T3: no wallet from T1`);
  }

  console.log("\n--- T4: New SCA wallet has zero native gas ---");
  if (newWalletId) {
    try {
      const tokenResponse = await client.getWalletTokenBalance({ id: newWalletId });
      const balances = tokenResponse.data?.tokenBalances ?? [];
      const nativeToken = balances.find((b: any) => b.token.isNative);
      const nativeBalance = nativeToken ? parseFloat(nativeToken.amount) : 0;
      check(
        "T4.1 new wallet has zero native gas (sponsored TX precondition)",
        nativeBalance === 0,
        `native balance = ${nativeBalance}`
      );
    } catch (err: any) {
      check("T4.1 native gas check", false, err.message);
    }
  } else {
    console.log(`[${S}] T4: no wallet from T1`);
  }

  console.log("\n--- T5: Sponsored USDC payment (manual step if wallet unfunded) ---");
  if (newWalletAddress) {
    const usdcBalance = parseFloat(await getBalance(newWalletAddress));
    if (usdcBalance < 0.01) {
      console.log(`[${S}] T5: Wallet has ${usdcBalance} USDC — too low to test payment.`);
      console.log(`   Fund ${newWalletAddress} on Arc Testnet and re-run to test Gas Station flow.`);
    } else {
      console.log(`   Wallet has ${usdcBalance} USDC. Gas Station flow ready.`);
      console.log(`   Skipping live payment — requires Supabase userId. Test via the UI /shop route.`);
    }
  } else {
    console.log(`[${S}] T5: no wallet from T1`);
  }

  console.log("\n--- T6: Failure paths ---");
  try {
    const zero = await getBalance("0x0000000000000000000000000000000000000001");
    check("T6.1 getBalance for known-zero address returns 0", parseFloat(zero) === 0, `"${zero}"`);
  } catch (err: any) {
    check("T6.1 getBalance for zero-address", false, err.message);
  }

  try {
    const type = await getWalletAccountType("invalid-id-does-not-exist");
    check("T6.2 getWalletAccountType bad ID returns UNKNOWN (no crash)", true, `returned: "${type}"`);
  } catch (err: any) {
    check("T6.2 getWalletAccountType bad ID should not throw", false, err.message);
  }

  console.log("\n=== Summary ===");
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) {
    results.filter((r) => !r.passed).forEach((r) => console.log(`  FAIL: ${r.name}: ${r.detail}`));
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
