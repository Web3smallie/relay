import { Router } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "../supabaseAdmin";
import { mintReceipt } from "../agent/mintReceipt";
import { markReceiptMinted } from "../mintedReceiptsCache";

const router = Router();

type ScpEventName =
  | "Authorized"
  | "Captured"
  | "Charged"
  | "Voided"
  | "Reclaimed"
  | "Refunded";

interface ScpWebhookPayload {
  contractAddress: string;
  eventName: ScpEventName;
  data: {
    salt?: string;
    amount?: string;
    transactionHash?: string;
    blockNumber?: number;
    payer?: string;
  };
}

router.post("/payments", async (req, res) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const sig = (req.headers["x-scp-signature"] as string) || "";
    const rawBody = JSON.stringify(req.body);
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (!sig || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  const payload = req.body as ScpWebhookPayload;
  const { eventName, data } = payload;
  const salt = data?.salt;

  console.log(`[SCP Webhook] Received ${eventName} for salt ${salt}`);

  if (!salt) {
    return res.json({ ok: true });
  }

  try {
    // Map event to order status
    let newStatus: string | undefined;
    let isCaptured = false;

    switch (eventName) {
      case "Authorized":
        newStatus = "Reserved";
        break;
      case "Captured":
      case "Charged":
        newStatus = "Paid";
        isCaptured = true;
        break;
      case "Voided":
        newStatus = "Canceled";
        break;
      case "Reclaimed":
        newStatus = "Expired";
        break;
      case "Refunded":
        newStatus = "Refunded";
        break;
    }

    // Lookup order by salt in JSON payment_info
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .contains("payment_info", { salt })
      .maybeSingle();

    if (order && newStatus) {
      await supabaseAdmin
        .from("orders")
        .update({ status: newStatus })
        .eq("id", order.id);

      // If captured, trigger NFT receipt minting automatically
      if (isCaptured && order.payer) {
        try {
          const receipt = await mintReceipt(order.payer, {
            orderNumber: order.id.slice(0, 8),
            product: "Purchase",
            amount: Number(order.total) || 0,
            currency: order.currency || "USDC",
          });

          markReceiptMinted(order.id, {
            contractAddress: process.env.RELAY_RECEIPT_CONTRACT_ADDRESS || "",
            transactionHash: receipt.hash,
            mintedAt: new Date().toISOString(),
          });
          console.log(`[SCP Webhook] Minted receipt NFT for order ${order.id}`);
        } catch (mintErr) {
          console.error("[SCP Webhook] Receipt mint failed:", mintErr);
        }
      }
    }

    res.json({ ok: true, event: eventName });
  } catch (err) {
    console.error("[SCP Webhook] Error processing event:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
