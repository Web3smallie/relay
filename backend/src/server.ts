import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { supabase } from "./supabaseClient";
import authRoutes from "./routes/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);

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