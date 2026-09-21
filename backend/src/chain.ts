import { createPublicClient, http, formatUnits, defineChain } from "viem";
import { ARC_USDC_ADDRESS } from "./contracts/index"; // arc-studio-allow-onchain-literal

// Arc Testnet — Circle's stablecoin-native L1
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    decimals: 18, // native gas representation — see note below
    name: "USDC",
    symbol: "USDC",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"], // arc-studio-allow-onchain-literal
    },
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: "https://testnet.arcscan.app",
    },
  },
});

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

// USDC on Arc is exposed as both native gas (18-decimal) and ERC-20 (6-decimal).
// They represent the same pool of funds. For display we must use the ERC-20
// view so the number shown to users matches their actual USDC balance.
const USDC_DECIMALS = 6;

const ERC20_BALANCE_OF_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/**
 * Returns the wallet's USDC balance as a human-readable decimal string with
 * 6-decimal precision (e.g. "12.340000"). Uses ERC-20 balanceOf() on the Arc
 * USDC contract so the result is always in USDC units — NOT the 18-decimal
 * native gas representation, which would produce a wildly wrong display value.
 */
export async function getBalance(address: string): Promise<string> {
  const raw = await publicClient.readContract({
    address: ARC_USDC_ADDRESS,
    abi: ERC20_BALANCE_OF_ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
  });

  return formatUnits(raw as bigint, USDC_DECIMALS);
}
