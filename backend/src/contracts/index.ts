import type { Abi, Address } from "viem";
import escrowArtifact from "./artifacts/AuthCaptureEscrow.json";
import collectorArtifact from "./artifacts/ERC3009PaymentCollector.json";
import refundCollectorArtifact from "./artifacts/OperatorRefundCollector.json";

/**
 * Canonical Arc Testnet addresses and ABIs for the Commerce Payments Protocol.
 */
export const MULTICALL3_ADDRESS: Address =
  "0xcA11bde05977b3631167028862bE2a173976CA11";

export const ARC_USDC_ADDRESS: Address =
  "0x3600000000000000000000000000000000000000";

export const ARC_EURC_ADDRESS: Address =
  "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

// Default deployed addresses on Arc Testnet from reference deployment
export const DEFAULT_ESCROW_ADDRESS: Address =
  "0xa5b4fa1890619cf03b8d6b11e0c680345b1881d8";

export const DEFAULT_TOKEN_COLLECTOR_ADDRESS: Address =
  "0x01e39d4a0b8ffeac8ae1618dbf316d15a8ee867c";

export const ESCROW_ABI = escrowArtifact.abi as Abi;
export const ERC3009_COLLECTOR_ABI = collectorArtifact.abi as Abi;
export const OPERATOR_REFUND_COLLECTOR_ABI = refundCollectorArtifact.abi as Abi;

export const ESCROW_BYTECODE = escrowArtifact.bytecode as `0x${string}`;
export const ERC3009_COLLECTOR_BYTECODE = collectorArtifact.bytecode as `0x${string}`;
export const OPERATOR_REFUND_COLLECTOR_BYTECODE = refundCollectorArtifact.bytecode as `0x${string}`;

export function escrowAddress(): Address {
  return (
    (process.env.NEXT_PUBLIC_ESCROW_ADDRESS as Address) ||
    (process.env.COMMERCE_ESCROW_ADDRESS as Address) ||
    DEFAULT_ESCROW_ADDRESS
  );
}

export function tokenCollectorAddress(): Address {
  return (
    (process.env.NEXT_PUBLIC_TOKEN_COLLECTOR_ADDRESS as Address) ||
    (process.env.COMMERCE_TOKEN_COLLECTOR_ADDRESS as Address) ||
    DEFAULT_TOKEN_COLLECTOR_ADDRESS
  );
}

export function operatorRefundCollectorAddress(): Address {
  return (
    (process.env.NEXT_PUBLIC_REFUND_COLLECTOR_ADDRESS as Address) ||
    (process.env.COMMERCE_REFUND_COLLECTOR_ADDRESS as Address) ||
    escrowAddress()
  );
}
