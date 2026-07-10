import { Router } from "express";

const router = Router();

// Called by Saleor when a checkout starts the payment process.
// We respond telling Saleor we're ready to handle the charge ourselves.
router.post("/transaction-initialize", async (req, res) => {
  console.log("Saleor transaction-initialize called:", JSON.stringify(req.body, null, 2));

  res.json({
    pspReference: `relay-${Date.now()}`,
    result: "CHARGE_ACTION_REQUIRED",
    amount: req.body.action?.amount ?? 0,
    data: {
      message: "Waiting for Relay to confirm USDC payment",
    },
  });
});

// Called by Saleor to check/continue the payment process.
// This is where we'll eventually verify the real USDC transfer before confirming.
router.post("/transaction-process", async (req, res) => {
  console.log("Saleor transaction-process called:", JSON.stringify(req.body, null, 2));

  // TEMPORARY: auto-confirm for now, so we can test the flow end-to-end.
  // We will replace this with real on-chain USDC verification next.
  res.json({
    pspReference: `relay-${Date.now()}`,
    result: "CHARGE_SUCCESS",
    amount: req.body.action?.amount ?? 0,
    data: {
      message: "Payment confirmed by Relay (temporary auto-confirm)",
    },
  });
});

export default router;