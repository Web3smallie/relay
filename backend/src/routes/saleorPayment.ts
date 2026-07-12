import { Router } from "express";
import { verifyUsdcPayment } from "../agent/verifyPayment";

const router = Router();

// Called by Saleor when a checkout starts the payment process.
router.post("/transaction-initialize", async (req, res) => {
  console.log("Saleor transaction-initialize called:", JSON.stringify(req.body, null, 2));

  const amount = req.body.action?.amount ?? 0;

  res.json({
    pspReference: `relay-${Date.now()}`,
    result: "CHARGE_ACTION_REQUIRED",
    amount,
    data: {
      message: "Send USDC to Relay's treasury wallet to complete payment",
      treasuryAddress: process.env.RELAY_TREASURY_ADDRESS,
      expectedAmount: amount,
    },
  });
});

// Called by Saleor to check/continue the payment process.
// This now actually verifies a real on-chain USDC transfer before confirming.
router.post("/transaction-process", async (req, res) => {
  console.log("Saleor transaction-process called:", JSON.stringify(req.body, null, 2));

  const amount = req.body.action?.amount ?? 0;
  const payerAddress = req.body.data?.payerAddress;

  if (!payerAddress) {
    return res.json({
      pspReference: `relay-${Date.now()}`,
      result: "CHARGE_FAILURE",
      amount: 0,
      data: {
        message: "No payer wallet address provided — cannot verify payment",
      },
    });
  }

  try {
    const isPaid = await verifyUsdcPayment(payerAddress, amount);

    if (isPaid) {
      res.json({
        pspReference: `relay-${Date.now()}`,
        result: "CHARGE_SUCCESS",
        amount,
        data: {
          message: "Real USDC payment verified on-chain",
        },
      });
    } else {
      res.json({
        pspReference: `relay-${Date.now()}`,
        result: "CHARGE_FAILURE",
        amount: 0,
        data: {
          message: "No matching USDC payment found on-chain yet",
        },
      });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    res.json({
      pspReference: `relay-${Date.now()}`,
      result: "CHARGE_FAILURE",
      amount: 0,
      data: {
        message: "Error verifying payment",
      },
    });
  }
});

export default router;