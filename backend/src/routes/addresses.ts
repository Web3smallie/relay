import { Router } from "express";
import { supabaseAdmin } from "../supabaseAdmin";

const router = Router();

// Add a new address for a user
router.post("/addresses", async (req, res) => {
  const { userId, label, fullName, phone, street, city, state, postalCode, country } = req.body;

  if (!userId || !label || !street) {
    return res.status(400).json({ error: "userId, label, and street are required" });
  }

  const { data, error } = await supabaseAdmin
    .from("addresses")
    .insert({
      user_id: userId,
      label,
      full_name: fullName,
      phone,
      street,
      city,
      state,
      postal_code: postalCode,
      country,
    })
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ address: data[0] });
});

// Get all addresses for a user
router.get("/addresses/:userId", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("addresses")
    .select("*")
    .eq("user_id", req.params.userId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ addresses: data });
});

export default router;