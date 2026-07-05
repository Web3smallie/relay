import { Router } from "express";
import { supabase } from "../supabaseClient";
import { supabaseAdmin } from "../supabaseAdmin";
import { createWallet } from "../wallet";
import { encrypt } from "../crypto";

const router = Router();

// Sign up a new user
router.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const userId = data.user?.id;

  if (userId) {
    try {
      const wallet = await createWallet();

      const { error: walletError } = await supabaseAdmin.from("wallets").insert({
        user_id: userId,
        address: wallet.address,
        encrypted_private_key: encrypt(wallet.privateKey),
        encrypted_mnemonic: encrypt(wallet.mnemonic),
      });

      if (walletError) {
        console.error("Failed to save wallet:", walletError.message);
      }
    } catch (walletCreationError) {
      console.error("Failed to create wallet:", walletCreationError);
    }
  }

  res.json({ user: data.user, session: data.session });
});

// Log in an existing user
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ user: data.user, session: data.session });
});

export default router;