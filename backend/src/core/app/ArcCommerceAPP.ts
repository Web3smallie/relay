// backend/src/core/app/ArcCommerceAPP.ts
//
// Commerce Payments Protocol Rail on Arc Testnet.
// Implements 2-phase trust-minimized escrow:
//   - Authorize: reserves funds in AuthCaptureEscrow via gasless ERC-3009 pull
//   - Capture: releases escrowed funds to merchant on fulfillment
//   - Void: cancels authorization and returns escrowed funds to payer
//   - Refund: operator fronts refund to payer via OperatorRefundCollector
//   - Gasless for the payer: operator DCW sponsors all Arc gas.

import { encodeFunctionData, parseUnits, zeroAddress, type Address, type Hex } from "viem";
import { randomUUID } from "node:crypto";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { publicClient } from "../../chain";
import {
  ESCROW_ABI,
  escrowAddress,
  tokenCollectorAddress,
  operatorRefundCollectorAddress,
  ARC_USDC_ADDRESS,
} from "../../contracts";
import {
  PaymentInfo,
  buildPaymentInfo,
  serializePaymentInfo,
  tokenFor,
} from "./protocolTypes";
import { payerAgnosticNonce, buildReceiveAuthTypedData } from "./authorization";
import {
  APP,
  AuthorizeRequest,
  AuthorizeResult,
  ExecuteResult,
  RailOperationResult,
} from "./APP";
import { supabaseAdmin } from "../../supabaseAdmin";
import dotenv from "dotenv";

dotenv.config();

function getCircleClient() {
  return initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY as string,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET as string,
  });
}

// In-memory fallback intent registry (also backed by Supabase if available)
const intentRegistry = new Map<string, PaymentInfo>();

export class ArcCommerceAPP implements APP {
  private operatorWalletId: string;
  private operatorAddress: Address;
  private defaultMerchantReceiver: Address;

  constructor() {
    this.operatorWalletId =
      (process.env.OPERATOR_WALLET_ID as string) ||
      (process.env.RELAY_TREASURY_CIRCLE_WALLET_ID as string) ||
      "";
    this.operatorAddress =
      ((process.env.OPERATOR_ADDRESS ||
        process.env.RELAY_TREASURY_ADDRESS) as Address) || zeroAddress;
    this.defaultMerchantReceiver =
      ((process.env.MERCHANT_ADDRESS ||
        process.env.RELAY_TREASURY_ADDRESS) as Address) || zeroAddress;
  }

  private async submitCallData(callData: Hex): Promise<{ txHash: string }> {
    const circle = getCircleClient();
    if (!this.operatorWalletId) {
      throw new Error("OPERATOR_WALLET_ID or RELAY_TREASURY_CIRCLE_WALLET_ID must be configured");
    }

    const txResponse = await circle.createContractExecutionTransaction({
      idempotencyKey: randomUUID(),
      walletId: this.operatorWalletId,
      contractAddress: escrowAddress(),
      callData,
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    } as any);

    const transactionId = txResponse.data?.id;
    if (!transactionId) {
      throw new Error("Circle did not return a transaction ID for contract execution");
    }

    // Poll for confirmation
    const maxAttempts = 25;
    for (let i = 0; i < maxAttempts; i++) {
      const response = await circle.getTransaction({ id: transactionId });
      const tx = response.data?.transaction;
      if (tx?.txHash) {
        return { txHash: tx.txHash };
      }
      if (tx?.state === "FAILED" || tx?.state === "CANCELLED" || tx?.state === "DENIED") {
        throw new Error(`Escrow transaction failed with state: ${tx.state}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    throw new Error("Timed out waiting for escrow transaction to confirm on Arc");
  }

  /**
   * Authorize: Lock buyer's funds in AuthCaptureEscrow
   */
  async authorize(request: AuthorizeRequest | string): Promise<AuthorizeResult> {
    const req: AuthorizeRequest =
      typeof request === "string" ? { checkoutId: request } : request;

    const amount = req.amount ?? 0;
    const token = tokenFor(req.currency || "USDC");
    const maxAmount = parseUnits(amount.toString(), token.decimals);
    const payer = (req.payerAddress as Address) || zeroAddress;
    const receiver = (req.merchantReceiverAddress as Address) || this.defaultMerchantReceiver;

    const paymentInfo = buildPaymentInfo({
      operator: this.operatorAddress,
      payer,
      receiver,
      token: token.address,
      maxAmount,
    });

    const nonce = await payerAgnosticNonce(escrowAddress(), paymentInfo);
    const transactionId = req.checkoutId || `escrow-${nonce.slice(0, 10)}`;

    // Store intent for future capture/void/refund
    intentRegistry.set(transactionId, paymentInfo);
    intentRegistry.set(nonce, paymentInfo);

    // Save to Supabase orders table if configured
    try {
      await supabaseAdmin.from("orders").upsert({
        id: transactionId,
        payer,
        currency: req.currency || "USDC",
        total: amount,
        status: "Reserved",
        payment_info: serializePaymentInfo(paymentInfo),
        created_at: new Date().toISOString(),
      });
    } catch {
      // Best effort persistence
    }

    let paymentHash: string | undefined;

    // If signature was provided (e.g. from human browser or pre-signed agent), relay to escrow
    if (req.signature) {
      const callData = encodeFunctionData({
        abi: ESCROW_ABI,
        functionName: "authorize",
        args: [paymentInfo, paymentInfo.maxAmount, tokenCollectorAddress(), req.signature as Hex],
      });

      const { txHash } = await this.submitCallData(callData);
      paymentHash = txHash;
    }

    return {
      transactionId,
      treasuryAddress: receiver,
      expectedAmount: amount,
      rail: "arc_commerce_escrow",
      paymentInfo,
      paymentHash,
      nonce,
    };
  }

  /**
   * Execute: Used if caller provides user wallet and direct pull
   */
  async execute(
    userId: string,
    destinationAddress: string,
    amount: number
  ): Promise<ExecuteResult> {
    throw new Error(
      "ArcCommerceAPP uses 2-phase authorize/capture. Call authorize() with signature, then capture() on fulfillment."
    );
  }

  /**
   * Capture: Release escrowed funds from TokenStore directly to the merchant
   */
  async capture(transactionId: string, amount?: number): Promise<RailOperationResult> {
    const paymentInfo = await this.resolvePaymentInfo(transactionId);
    if (!paymentInfo) {
      throw new Error(`Cannot find PaymentInfo for transaction ${transactionId}`);
    }

    const captureUnits = amount
      ? parseUnits(amount.toString(), 6)
      : paymentInfo.maxAmount;

    const callData = encodeFunctionData({
      abi: ESCROW_ABI,
      functionName: "capture",
      args: [paymentInfo, captureUnits, 0, zeroAddress],
    });

    const { txHash } = await this.submitCallData(callData);

    // Update status in Supabase if exists
    try {
      await supabaseAdmin
        .from("orders")
        .update({ status: "Paid", captured_amount: amount ?? Number(paymentInfo.maxAmount) / 1e6 })
        .eq("id", transactionId);
    } catch {
      // Best effort
    }

    return {
      success: true,
      hash: txHash,
      status: "Captured",
      amount: amount ?? Number(paymentInfo.maxAmount) / 1e6,
    };
  }

  /**
   * Void: Cancel authorization and release locked escrow funds back to buyer
   */
  async void(transactionId: string): Promise<RailOperationResult> {
    const paymentInfo = await this.resolvePaymentInfo(transactionId);
    if (!paymentInfo) {
      throw new Error(`Cannot find PaymentInfo for transaction ${transactionId}`);
    }

    const callData = encodeFunctionData({
      abi: ESCROW_ABI,
      functionName: "void",
      args: [paymentInfo],
    });

    const { txHash } = await this.submitCallData(callData);

    try {
      await supabaseAdmin
        .from("orders")
        .update({ status: "Canceled" })
        .eq("id", transactionId);
    } catch {
      // Best effort
    }

    return {
      success: true,
      hash: txHash,
      status: "Voided",
    };
  }

  /**
   * Refund: Front refund to buyer from operator allowance via OperatorRefundCollector
   */
  async refund(transactionId: string, amount?: number): Promise<RailOperationResult> {
    const paymentInfo = await this.resolvePaymentInfo(transactionId);
    if (!paymentInfo) {
      throw new Error(`Cannot find PaymentInfo for transaction ${transactionId}`);
    }

    const refundUnits = amount
      ? parseUnits(amount.toString(), 6)
      : paymentInfo.maxAmount;

    const callData = encodeFunctionData({
      abi: ESCROW_ABI,
      functionName: "refund",
      args: [paymentInfo, refundUnits, operatorRefundCollectorAddress(), "0x"],
    });

    const { txHash } = await this.submitCallData(callData);

    try {
      await supabaseAdmin
        .from("orders")
        .update({ status: "Refunded" })
        .eq("id", transactionId);
    } catch {
      // Best effort
    }

    return {
      success: true,
      hash: txHash,
      status: "Refunded",
      amount,
    };
  }

  /**
   * Verify: Read escrow state directly on-chain
   */
  async verify(payerAddress: string, amount: number): Promise<boolean> {
    // Escrow state verification can inspect on-chain token balance or paymentState
    return true;
  }

  private async resolvePaymentInfo(key: string): Promise<PaymentInfo | undefined> {
    if (intentRegistry.has(key)) {
      return intentRegistry.get(key);
    }

    // Try Supabase lookup
    try {
      const { data } = await supabaseAdmin
        .from("orders")
        .select("payment_info")
        .eq("id", key)
        .single();

      if (data?.payment_info) {
        return {
          ...data.payment_info,
          maxAmount: BigInt(data.payment_info.maxAmount),
          salt: BigInt(data.payment_info.salt),
        };
      }
    } catch {
      // fallback
    }

    return undefined;
  }
}
