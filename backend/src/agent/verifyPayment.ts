import { createPublicClient, http, parseAbiItem, formatUnits } from "viem";
import { xLayerTestnet } from "../chain";
import dotenv from "dotenv";

dotenv.config();

const usdcAddress = process.env.USDC_CONTRACT_ADDRESS as `0x${string}`;
const treasuryAddress = process.env.RELAY_TREASURY_ADDRESS as `0x${string}`;

const client = createPublicClient({
  chain: xLayerTestnet,
  transport: http(),
});

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

/**
 * Checks recent blocks for a real USDC Transfer event sent TO our treasury
 * wallet FROM the given payer address, matching at least the expected amount.
 * Returns true if a matching payment is found.
 */
export async function verifyUsdcPayment(
  payerAddress: string,
  expectedAmount: number
): Promise<boolean> {
  const currentBlock = await client.getBlockNumber();
  // Look back over the last ~500 blocks for a matching transfer
  const fromBlock = currentBlock > 500n ? currentBlock - 500n : 0n;

  const logs = await client.getLogs({
    address: usdcAddress,
    event: TRANSFER_EVENT,
    args: {
      from: payerAddress as `0x${string}`,
      to: treasuryAddress,
    },
    fromBlock,
    toBlock: currentBlock,
  });

  for (const log of logs) {
    const amount = parseFloat(formatUnits(log.args.value as bigint, 6)); // USDC has 6 decimals
    if (amount >= expectedAmount) {
      return true;
    }
  }

  return false;
}