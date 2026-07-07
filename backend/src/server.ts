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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/", profileRoutes);
app.use("/", addressRoutes);

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
    const { constraints } = req.body;
    if (!constraints) {
      return res.status(400).json({ error: "constraints is required" });
    }

    const result = await searchWithConstraints(constraints);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});