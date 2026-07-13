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

const MAX_BLOCK_RANGE = 99n; // this RPC enforces a 100-block max range

/**
 * Checks for a real USDC Transfer event sent TO our treasury wallet FROM the
 * given payer address, matching at least the expected amount. Searches
 * backward from the current block in safe 99-block chunks, up to a
 * reasonable depth, to work within this RPC's block-range limit.
 */
export async function verifyUsdcPayment(
  payerAddress: string,
  expectedAmount: number,
  maxChunksToSearch = 20 // 20 chunks * 99 blocks ≈ ~2000 blocks of history
): Promise<boolean> {
  const currentBlock = await client.getBlockNumber();
  let toBlock = currentBlock;

  for (let i = 0; i < maxChunksToSearch; i++) {
    const fromBlock = toBlock > MAX_BLOCK_RANGE ? toBlock - MAX_BLOCK_RANGE : 0n;

    const logs = await client.getLogs({
      address: usdcAddress,
      event: TRANSFER_EVENT,
      args: {
        from: payerAddress as `0x${string}`,
        to: treasuryAddress,
      },
      fromBlock,
      toBlock,
    });

    for (const log of logs) {
      const amount = parseFloat(formatUnits(log.args.value as bigint, 6));
      if (amount >= expectedAmount) {
        return true;
      }
    }

    if (fromBlock === 0n) break;
    toBlock = fromBlock - 1n;
  }

  return false;
}