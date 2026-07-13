import { createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { xLayerTestnet } from "./chain";
import dotenv from "dotenv";

dotenv.config();

// The private key of our test wallet (0xbef8e180c0859f500afaf40442d9830ca4cf02c8)
// This is ONLY for this one-time manual test — never hardcode real keys like this in production code.
const TEST_WALLET_PRIVATE_KEY = "0xe43d8e82c16714e01f0f70cfb2b2ab34546c67489d11d9dec115c49c613512b1";

const USDC_ADDRESS = process.env.USDC_CONTRACT_ADDRESS as `0x${string}`;
const TREASURY_ADDRESS = process.env.RELAY_TREASURY_ADDRESS as `0x${string}`;

async function main() {
  const account = privateKeyToAccount(TEST_WALLET_PRIVATE_KEY as `0x${string}`);

  const client = createWalletClient({
    account,
    chain: xLayerTestnet,
    transport: http(),
  });

  // Standard ERC-20 transfer function signature
  const transferAbi = [
    {
      name: "transfer",
      type: "function",
      inputs: [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
    },
  ] as const;

  const amountArg = process.argv[2];

if (!amountArg) {
  console.error("Usage: npx tsx src/sendTestPayment.ts <amount>");
  console.error("Example: npx tsx src/sendTestPayment.ts 2.50");
  process.exit(1);
}

const amount = parseUnits(amountArg, 6); // USDC has 6 decimals

  console.log(`Sending ${amountArg} USDC from ${account.address} to ${TREASURY_ADDRESS}...`);

  const hash = await client.writeContract({
    address: USDC_ADDRESS,
    abi: transferAbi,
    functionName: "transfer",
    args: [TREASURY_ADDRESS, amount],
  });

  console.log("Transaction sent! Hash:", hash);
}

main().catch(console.error);