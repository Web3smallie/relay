import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { supabase } from "./supabaseClient";
import authRoutes from "./routes/auth";
import { getBalance } from "./chain";
import profileRoutes from "./routes/profile";
import addressRoutes from "./routes/addresses";

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

app.listen(PORT, () => {
  console.log(`Relay backend listening on port ${PORT}`);
});

app.get("/wallet/:address/balance", async (req, res) => {
  try {
    const balance = await getBalance(req.params.address);
    res.json({ address: req.params.address, balance });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});