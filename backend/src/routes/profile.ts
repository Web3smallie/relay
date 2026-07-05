import { Router } from "express";
import { supabaseAdmin } from "../supabaseAdmin";

const router = Router();

// Create or update a user's profile
router.post("/profile", async (req, res) => {
  const { userId, fullName, email, phone } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .upsert(
      { user_id: userId, full_name: fullName, email, phone },
      { onConflict: "user_id" }
    )
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ profile: data[0] });
});

// Get a user's profile
router.get("/profile/:userId", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("user_id", req.params.userId)
    .single();

  if (error) {
    return res.status(404).json({ error: "Profile not found" });
  }

  res.json({ profile: data });
});

export default router;