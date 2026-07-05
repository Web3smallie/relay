import { createPublicClient, http, formatEther, defineChain } from "viem";

// X Layer Testnet — verified via OKX developer docs
export const xLayerTestnet = defineChain({
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "OKB",
    symbol: "OKB",
  },
  rpcUrls: {
    default: {
      http: ["https://testrpc.xlayer.tech/terigon"],
    },
  },
  blockExplorers: {
    default: {
      name: "X Layer Explorer",
      url: "https://www.okx.com/web3/explorer/xlayer-test",
    },
  },
});

export const publicClient = createPublicClient({
  chain: xLayerTestnet,
  transport: http(),
});

export async function getBalance(address: string): Promise<string> {
  const balanceWei = await publicClient.getBalance({
    address: address as `0x${string}`,
  });

  return formatEther(balanceWei);
}