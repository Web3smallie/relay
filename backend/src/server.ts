import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { supabase } from "./supabaseClient";
import { supabaseAdmin } from "./supabaseAdmin";
import authRoutes from "./routes/auth";
import profileRoutes from "./routes/profile";
import addressRoutes from "./routes/addresses";
import { getBalance } from "./chain";
import { createWallet } from "./wallet";
import { encrypt } from "./crypto";
import { ShopifyAdapter } from "./merchants/ShopifyAdapter";
import { parseConstraints } from "./agent/constraintParser";
import { executePurchaseSearch } from "./agent/executePurchaseSearch";
import { searchWithConstraints } from "./agent/executePurchaseSearch";
import { SaleorAdapter } from "./merchants/SaleorAdapter";
import saleorPaymentRoutes from "./routes/saleorPayment";
import { initiatePayment } from "./agent/executePayment";
import { sendUsdcPayment } from "./agent/sendPayment";
import { RelayAPP } from "./core/app/RelayAPP";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`>>> INCOMING REQUEST: ${req.method} ${req.url}`);
  next();
});
app.use("/auth", authRoutes);
app.use("/", profileRoutes);
app.use("/", addressRoutes);
app.use("/saleor-payment", saleorPaymentRoutes);


app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Relay backend is running" });
});

app.get("/test-db", async (req, res) => {
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ profiles: data });
});

app.get("/wallet/:address/balance", async (req, res) => {
  try {
    const balance = await getBalance(req.params.address);
    res.json({ address: req.params.address, balance });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get("/wallet/for-user/:userId", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("wallets")
    .select("address")
    .eq("user_id", req.params.userId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "No wallet found for this user" });
  }

  res.json({ address: data.address });
});

app.get("/wallet-status/:userId", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("wallets")
    .select("address")
    .eq("user_id", req.params.userId)
    .single();

  res.json({ hasWallet: !error && !!data });
});

app.post("/wallet/create-for-user", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const wallet = await createWallet();

    const { error } = await supabaseAdmin.from("wallets").insert({
      user_id: userId,
      address: wallet.address,
      encrypted_private_key: encrypt(wallet.privateKey),
      encrypted_mnemonic: encrypt(wallet.mnemonic),
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ address: wallet.address });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`Relay backend listening on port ${PORT}`);
});

app.get("/merchant-search", async (req, res) => {
  try {
    const query = (req.query.q as string) || "";
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;

    const adapter = new ShopifyAdapter();
    const results = await adapter.search({ query, maxPrice });

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/agent/parse", async (req, res) => {
  try {
    const { request } = req.body;
    if (!request) {
      return res.status(400).json({ error: "request is required" });
    }

    const constraints = await parseConstraints(request);
    res.json({ constraints });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/agent/search", async (req, res) => {
  try {
    const { request } = req.body;
    if (!request) {
      return res.status(400).json({ error: "request is required" });
    }

    const result = await executePurchaseSearch(request);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/agent/search-with-constraints", async (req, res) => {
  try {
    const { constraints, payerAddress, userId } = req.body;
    if (!constraints) {
      return res.status(400).json({ error: "constraints is required" });
    }

    const result = await searchWithConstraints(constraints, payerAddress, userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get("/saleor-search", async (req, res) => {
  try {
    const query = (req.query.q as string) || "";
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;

    const adapter = new SaleorAdapter();
    const results = await adapter.search({ query, maxPrice });

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/saleor-checkout", async (req, res) => {
  try {
    const { productId, quantity, payerAddress } = req.body;
    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }

    const adapter = new SaleorAdapter();
    const result = await adapter.checkout(productId, quantity || 1, payerAddress);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get("/test-verify-payment", async (req, res) => {
  try {
    const { verifyUsdcPayment } = await import("./agent/verifyPayment.js");
    const result = await verifyUsdcPayment(
      "0x294a9bAeF895e5161FE9c37A70DF3AF4eA323AB0",
      0.1
    );
    res.json({ verified: result });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/saleor-select-shipping", async (req, res) => {
  try {
    const { checkoutId } = req.body;
    if (!checkoutId) {
      return res.status(400).json({ error: "checkoutId is required" });
    }

    const { GraphQLClient, gql } = await import("graphql-request");
    const client = new GraphQLClient(process.env.SALEOR_API_URL as string, {
      headers: { Authorization: `Bearer ${process.env.SALEOR_APP_TOKEN}` },
    });

    // Get available shipping methods now that address is set
    const methodsQuery = gql`
      query GetShippingMethods($id: ID!) {
        checkout(id: $id) {
          shippingMethods {
            id
            name
          }
        }
      }
    `;

    const methodsData: any = await client.request(methodsQuery, { id: checkoutId });
    const firstMethod = methodsData.checkout?.shippingMethods?.[0];

    if (!firstMethod) {
      return res.status(400).json({ error: "No shipping methods available for this checkout" });
    }

    const updateMutation = gql`
      mutation SetShipping($id: ID!, $shippingMethodId: ID!) {
        checkoutShippingMethodUpdate(id: $id, shippingMethodId: $shippingMethodId) {
          checkout {
            id
          }
          errors {
            field
            message
          }
        }
      }
    `;

    const result: any = await client.request(updateMutation, {
      id: checkoutId,
      shippingMethodId: firstMethod.id,
    });

    res.json({ selectedShippingMethod: firstMethod.name, result });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});


app.post("/agent/pay", async (req, res) => {
  try {
    const { userId, checkoutId } = req.body;

    if (!userId || !checkoutId) {
      return res.status(400).json({ error: "userId and checkoutId are required" });
    }

    const app_ = new RelayAPP();

    const initiation = await app_.authorize(checkoutId);

    const payment = await app_.execute(
      userId,
      initiation.treasuryAddress,
      initiation.expectedAmount
    );

    res.json({
      transactionId: initiation.transactionId,
      amount: initiation.expectedAmount,
      paymentHash: payment.hash,
      payerAddress: payment.payerAddress,
      message: "Payment sent. Confirmation may take a few seconds to process on-chain.",
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/agent/parse-address", async (req, res) => {
  try {
    const { addressText } = req.body;
    if (!addressText) {
      return res.status(400).json({ error: "addressText is required" });
    }

    const { parseAddress } = await import("./agent/constraintParser.js");
    const address = await parseAddress(addressText);
    res.json({ address });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/saleor-payment-process-trigger", async (req, res) => {
  try {
    const { transactionId } = req.body;
    if (!transactionId) {
      return res.status(400).json({ error: "transactionId is required" });
    }

    const { GraphQLClient, gql } = await import("graphql-request");
    const client = new GraphQLClient(process.env.SALEOR_API_URL as string, {
      headers: { Authorization: `Bearer ${process.env.SALEOR_APP_TOKEN}` },
    });

    const mutation = gql`
      mutation TransactionProcess($id: ID!) {
        transactionProcess(id: $id) {
          transaction {
            id
          }
          data
          errors {
            field
            message
          }
        }
      }
    `;

    const result: any = await client.request(mutation, { id: transactionId });

    if (result.transactionProcess.errors.length > 0) {
      return res.status(500).json({ error: result.transactionProcess.errors });
    }

    res.json({
      success: true,
      message: result.transactionProcess.data?.message ?? null,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

