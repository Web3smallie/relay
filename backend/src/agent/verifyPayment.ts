import { createPublicClient, http, parseAbiItem, formatUnits } from "viem";
import { arcTestnet } from "../chain";
import dotenv from "dotenv";

dotenv.config();

const usdcAddress = process.env.USDC_CONTRACT_ADDRESS as `0x${string}`;
const treasuryAddress = process.env.RELAY_TREASURY_ADDRESS as `0x${string}`;

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

const MAX_BLOCK_RANGE = 99n;
const DELAY_BETWEEN_CHUNKS_MS = 400; // avoid tripping Arc testnet's rate limit
const RATE_LIMIT_RETRY_DELAY_MS = 2000;
const MAX_RATE_LIMIT_RETRIES = 3;

function isRateLimitError(err: unknown): boolean {
  const message = (err as any)?.details || (err as any)?.shortMessage || String(err);
  return message.includes("request limit reached") || (err as any)?.code === -32011;
}

async function getLogsWithRetry(fromBlock: bigint, toBlock: bigint, payerAddress: string) {
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    try {
      return await client.getLogs({
        address: usdcAddress,
        event: TRANSFER_EVENT,
        args: {
          from: payerAddress as `0x${string}`,
          to: treasuryAddress,
        },
        fromBlock,
        toBlock,
      });
    } catch (err) {
      if (isRateLimitError(err) && attempt < MAX_RATE_LIMIT_RETRIES) {
        console.log(`Rate limited, retrying in ${RATE_LIMIT_RETRY_DELAY_MS}ms (attempt ${attempt + 1})`);
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_RETRY_DELAY_MS));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Exceeded max rate-limit retries");
}

/**
 * Checks for a real USDC Transfer event sent TO our treasury wallet FROM the
 * given payer address, matching at least the expected amount. Searches
 * backward from the current block in safe 99-block chunks, up to a
 * reasonable depth, with a small delay between chunks and automatic
 * retry-with-backoff if Arc's testnet RPC rate-limits a request.
 */
export async function verifyUsdcPayment(
  payerAddress: string,
  expectedAmount: number,
  maxChunksToSearch = 20
): Promise<boolean> {
  const currentBlock = await client.getBlockNumber();
  let toBlock = currentBlock;

  for (let i = 0; i < maxChunksToSearch; i++) {
    const fromBlock = toBlock > MAX_BLOCK_RANGE ? toBlock - MAX_BLOCK_RANGE : 0n;

    const logs = await getLogsWithRetry(fromBlock, toBlock, payerAddress);

    for (const log of logs) {
      const amount = parseFloat(formatUnits(log.args.value as bigint, 6));
      if (amount >= expectedAmount) {
        return true;
      }
    }

    if (fromBlock === 0n) break;
    toBlock = fromBlock - 1n;

    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_CHUNKS_MS));
  }

  return false;
}