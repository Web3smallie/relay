import { zeroAddress, type Address, type Hex } from "viem";
import { publicClient, arcTestnet } from "../../chain";
import { ESCROW_ABI, escrowAddress } from "../../contracts";
import { PaymentInfo, SupportedToken, tokenFor } from "./protocolTypes";

export const RECEIVE_WITH_AUTHORIZATION_TYPES = {
  ReceiveWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

/**
 * Computes the payer-agnostic PaymentInfo hash from the on-chain AuthCaptureEscrow.
 * This hash acts as the unique ERC-3009 nonce, binding the signature to this exact order.
 */
export async function payerAgnosticNonce(
  escrow: Address = escrowAddress(),
  paymentInfo: PaymentInfo
): Promise<Hex> {
  return publicClient.readContract({
    address: escrow,
    abi: ESCROW_ABI,
    functionName: "getHash",
    args: [{ ...paymentInfo, payer: zeroAddress }],
  }) as Promise<Hex>;
}

export type ReceiveAuthParams = {
  currency?: SupportedToken;
  collector: Address;
  payer: Address;
  value: bigint;
  validBefore: number;
  nonce: Hex;
};

/**
 * Constructs EIP-712 typed data for the ERC-3009 ReceiveWithAuthorization message.
 */
export function buildReceiveAuthTypedData(params: ReceiveAuthParams) {
  const token = tokenFor(params.currency || "USDC");
  return {
    domain: {
      name: token.eip712Name,
      version: token.eip712Version,
      chainId: arcTestnet.id,
      verifyingContract: token.address,
    },
    types: RECEIVE_WITH_AUTHORIZATION_TYPES,
    primaryType: "ReceiveWithAuthorization",
    message: {
      from: params.payer,
      to: params.collector,
      value: params.value,
      validAfter: BigInt(0),
      validBefore: BigInt(params.validBefore),
      nonce: params.nonce,
    },
  } as const;
}
