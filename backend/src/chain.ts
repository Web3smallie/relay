import { createPublicClient, http, formatEther, defineChain } from "viem";

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
      http: ["https://rpc.testnet.arc.network"],
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

export async function getBalance(address: string): Promise<string> {
  const balanceWei = await publicClient.getBalance({
    address: address as `0x${string}`,
  });

  return formatEther(balanceWei);
}