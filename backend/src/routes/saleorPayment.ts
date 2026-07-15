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
        id
        metadata {
          key
          value
        }
      }
    }
  }
`;

const CHECKOUT_COMPLETE_MUTATION = gql`
  mutation CheckoutComplete($id: ID!) {
    checkoutComplete(id: $id) {
      order {
        id
        number
        status
      }
      errors {
        field
        message
      }
    }
  }
`;

async function getCheckoutInfoFromTransaction(
  transactionId: string
): Promise<{ checkoutId: string | null; payerAddress: string | null }> {
  console.log("=== METADATA LOOKUP START ===");
  console.log("Transaction ID:", transactionId);

  try {
    const data = await client.request<{
      transaction: {
        checkout: { id: string; metadata: { key: string; value: string }[] } | null;
      } | null;
    }>(GET_TRANSACTION_CHECKOUT_METADATA, { id: transactionId });

    console.log("Raw response:", JSON.stringify(data));

    const checkout = data.transaction?.checkout;
    const metadata = checkout?.metadata ?? [];
    const entry = metadata.find((m) => m.key === "payerAddress");

    console.log("=== METADATA LOOKUP END ===");

    return {
      checkoutId: checkout?.id ?? null,
      payerAddress: entry?.value ?? null,
    };
  } catch (error) {
    console.log("=== METADATA LOOKUP FAILED ===");
    console.error("Failed to fetch checkout info:", error);
    return { checkoutId: null, payerAddress: null };
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

  const { checkoutId, payerAddress } = transactionId
    ? await getCheckoutInfoFromTransaction(transactionId)
    : { checkoutId: null, payerAddress: null };

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
      // Respond to Saleor immediately so it records the charge —
      // completing the checkout must happen AFTER Saleor has this response,
      // not before, or checkoutComplete will always fail.
      res.json({
        pspReference: `relay-${Date.now()}`,
        result: "CHARGE_SUCCESS",
        amount,
        data: {
          message: "Real USDC payment verified on-chain",
        },
      });

      // Now attempt to complete the checkout in the background, with retries.
      if (checkoutId) {
        (async () => {
          const maxRetries = 5;
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 2000));

            try {
              const completeResult = await client.request<{
                checkoutComplete: {
                  order: { id: string; number: string; status: string } | null;
                  errors: { field: string; message: string }[];
                };
              }>(CHECKOUT_COMPLETE_MUTATION, { id: checkoutId });

              if (completeResult.checkoutComplete.errors.length > 0) {
                console.log(
                  `Checkout complete attempt ${attempt + 1} failed:`,
                  JSON.stringify(completeResult.checkoutComplete.errors)
                );
                continue;
              }

              console.log(
                "Order created:",
                JSON.stringify(completeResult.checkoutComplete.order)
              );
              return;
            } catch (completeError) {
              console.error(`Checkout complete attempt ${attempt + 1} error:`, completeError);
            }
          }
          console.error("Checkout complete failed after all retries for checkout:", checkoutId);
        })();
      }

      return;
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