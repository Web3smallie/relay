import { createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "../chain";
import { supabaseAdmin } from "../supabaseAdmin";
import { decrypt } from "../crypto";
import dotenv from "dotenv";

dotenv.config();

const USDC_ADDRESS = process.env.USDC_CONTRACT_ADDRESS as `0x${string}`;

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

/**
 * Sends a real USDC payment from a user's own wallet (decrypted from our
 * database) to the given treasury address. This is what actually executes
 * the autonomous payment step of a purchase.
 *
 * On Arc, USDC via the ERC-20 interface uses 6 decimals (parseUnits below).
 * This is different from Arc's *native* gas-token representation of USDC,
 * which uses 18 decimals — do not mix the two. This function only ever
 * touches the 6-decimal ERC-20 interface, which is correct for transfers.
 */
export async function sendUsdcPayment(
  userId: string,
  treasuryAddress: string,
  amount: number
): Promise<{ hash: string; payerAddress: string }> {
  const { data: walletRow, error } = await supabaseAdmin
    .from("wallets")
    .select("address, encrypted_private_key")
    .eq("user_id", userId)
    .single();

  if (error || !walletRow) {
    throw new Error("No wallet found for this user");
  }

  const privateKey = decrypt(walletRow.encrypted_private_key) as `0x${string}`;
  const account = privateKeyToAccount(privateKey);

  const client = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(),
  });

  const hash = await client.writeContract({
    address: USDC_ADDRESS,
    abi: transferAbi,
    functionName: "transfer",
    args: [treasuryAddress as `0x${string}`, parseUnits(amount.toString(), 6)],
  });

  return { hash, payerAddress: account.address };
}