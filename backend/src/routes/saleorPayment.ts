import { Router } from "express";
import { GraphQLClient, gql } from "graphql-request";
import { verifyUsdcPayment } from "../agent/verifyPayment";

const router = Router();

const apiUrl = process.env.SALEOR_API_URL as string;
const appToken = process.env.SALEOR_APP_TOKEN as string;

const client = new GraphQLClient(apiUrl, {
  headers: { Authorization: `Bearer ${appToken}` },
});

const GET_TRANSACTION_CHECKOUT_METADATA = gql`
  query GetTransactionCheckout($id: ID!) {
    transaction(id: $id) {
      checkout {
        metadata {
          key
          value
        }
      }
    }
  }
`;

async function getPayerAddressFromTransaction(transactionId: string): Promise<string | null> {
  console.log("=== METADATA LOOKUP START ===");
  console.log("Transaction ID:", transactionId);
  console.log("API URL:", apiUrl);
  console.log("Token (first 8 chars):", appToken?.substring(0, 8));

  try {
    const data = await client.request<{
      transaction: { checkout: { metadata: { key: string; value: string }[] } | null } | null;
    }>(GET_TRANSACTION_CHECKOUT_METADATA, { id: transactionId });

    console.log("Raw response:", JSON.stringify(data));

    const metadata = data.transaction?.checkout?.metadata ?? [];
    const entry = metadata.find((m) => m.key === "payerAddress");

    console.log("Found metadata:", JSON.stringify(metadata));
    console.log("=== METADATA LOOKUP END ===");

    return entry?.value ?? null;
  } catch (error) {
    console.log("=== METADATA LOOKUP FAILED ===");
    console.error("Failed to fetch checkout metadata:", error);
    return null;
  }
}

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

router.post("/transaction-process", async (req, res) => {
  console.log("Saleor transaction-process called:", JSON.stringify(req.body, null, 2));

  const amount = req.body.action?.amount ?? 0;
  const transactionId = req.body.transaction?.id;

  const payerAddress = transactionId
    ? await getPayerAddressFromTransaction(transactionId)
    : null;

  if (!payerAddress) {
    return res.json({
      pspReference: `relay-${Date.now()}`,
      result: "CHARGE_FAILURE",
      amount: 0,
      data: {
        message: "No payer wallet address found on this checkout — cannot verify payment",
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