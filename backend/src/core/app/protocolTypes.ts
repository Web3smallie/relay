import type { Address, Hex } from "viem";
import { zeroAddress } from "viem";
import { ARC_USDC_ADDRESS, ARC_EURC_ADDRESS } from "../../contracts";

export type SupportedToken = "USDC" | "EURC";

export type TokenConfig = {
  symbol: SupportedToken;
  address: Address;
  decimals: number;
  eip712Name: string;
  eip712Version: string;
};

export const TOKENS: Record<SupportedToken, TokenConfig> = {
  USDC: {
    symbol: "USDC",
    address: ARC_USDC_ADDRESS,
    decimals: 6,
    eip712Name: "USDC",
    eip712Version: "2",
  },
  EURC: {
    symbol: "EURC",
    address: ARC_EURC_ADDRESS,
    decimals: 6,
    eip712Name: "EURC",
    eip712Version: "2",
  },
};

export function tokenFor(symbol: SupportedToken = "USDC"): TokenConfig {
  return TOKENS[symbol] || TOKENS.USDC;
}

/**
 * Commerce Payments Protocol PaymentInfo struct.
 * Matches AuthCaptureEscrow on Arc Testnet.
 */
export type PaymentInfo = {
  /** Operator address that submits txs and pays Arc gas */
  operator: Address;
  /** Payer wallet address (shopper/agent) */
  payer: Address;
  /** Merchant receiver address for the payment */
  receiver: Address;
  /** Token address on Arc (USDC or EURC) */
  token: Address;
  /** Maximum authorized amount in 6-decimal token units */
  maxAmount: bigint;
  /** Expiry timestamp for off-chain ERC-3009 signature */
  preApprovalExpiry: number;
  /** Authorization expiry timestamp (reclaim available after this) */
  authorizationExpiry: number;
  /** Refund window expiry timestamp */
  refundExpiry: number;
  minFeeBps: number;
  maxFeeBps: number;
  feeReceiver: Address;
  salt: bigint;
};

export type SerializedPaymentInfo = Omit<PaymentInfo, "maxAmount" | "salt"> & {
  maxAmount: string;
  salt: string;
};

export function serializePaymentInfo(info: PaymentInfo): SerializedPaymentInfo {
  return {
    ...info,
    maxAmount: info.maxAmount.toString(),
    salt: info.salt.toString(),
  };
}

export function deserializePaymentInfo(info: SerializedPaymentInfo): PaymentInfo {
  return {
    ...info,
    maxAmount: BigInt(info.maxAmount),
    salt: BigInt(info.salt),
  };
}

export function randomSalt(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let salt = BigInt(0);
  for (const b of bytes) salt = (salt << BigInt(8)) | BigInt(b);
  return salt;
}

export const EXPIRY_DEFAULTS = {
  preApproval: 300, // 5 minutes for agent/shopper signing
  authorization: 7 * 24 * 60 * 60, // 7 days reservation
  refund: 30 * 24 * 60 * 60, // 30 days refund window
} as const;

export type BuildPaymentInfoParams = {
  operator: Address;
  payer: Address;
  receiver: Address;
  token?: Address;
  maxAmount: bigint;
  now?: number;
  preApprovalExpiry?: number;
  authorizationExpiry?: number;
  refundExpiry?: number;
  minFeeBps?: number;
  maxFeeBps?: number;
  feeReceiver?: Address;
  salt?: bigint;
};

export function buildPaymentInfo(params: BuildPaymentInfoParams): PaymentInfo {
  const now = params.now ?? Math.floor(Date.now() / 1000);
  return {
    operator: params.operator,
    payer: params.payer,
    receiver: params.receiver,
    token: params.token ?? ARC_USDC_ADDRESS,
    maxAmount: params.maxAmount,
    preApprovalExpiry:
      params.preApprovalExpiry ?? now + EXPIRY_DEFAULTS.preApproval,
    authorizationExpiry:
      params.authorizationExpiry ?? now + EXPIRY_DEFAULTS.authorization,
    refundExpiry: params.refundExpiry ?? now + EXPIRY_DEFAULTS.refund,
    minFeeBps: params.minFeeBps ?? 0,
    maxFeeBps: params.maxFeeBps ?? 0,
    feeReceiver: params.feeReceiver ?? zeroAddress,
    salt: params.salt ?? randomSalt(),
  };
}

export type SignedAuthorization = {
  from: Address;
  to: Address;
  value: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: Hex;
  signature: Hex;
};
