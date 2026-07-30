import { Router } from "express";
import { supabase } from "../supabaseClient";
import { supabaseAdmin } from "../supabaseAdmin";
import { createWallet } from "../wallet";

const router = Router();

// Sign up a new user — creates auth account, profile, and wallet in one step
router.post("/signup", async (req, res) => {
  const { email, password, fullName, phone } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "http://localhost:3000/auth/callback",
    },
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const userId = data.user?.id;
  let walletCreated = false;

  if (userId) {
    // Create profile
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      { user_id: userId, full_name: fullName ?? null, email, phone: phone ?? null },
      { onConflict: "user_id" }
    );

    if (profileError) {
      console.error("Failed to save profile:", profileError.message);
    }

    // Create wallet
    try {
      const wallet = await createWallet();

      const { error: walletError } = await supabaseAdmin.from("wallets").insert({
        user_id: userId,
        address: wallet.address,
        circle_wallet_id: wallet.circleWalletId,
      });

      if (walletError) {
        console.error("Failed to save wallet:", walletError.message);
      } else {
        walletCreated = true;
      }
    } catch (walletCreationError) {
      console.error("Failed to create wallet:", walletCreationError);
    }
  }

  res.json({
    user: data.user,
    session: data.session,
    walletCreated,
    message: walletCreated
      ? "Signup successful."
      : "Signup successful, but wallet creation failed — please retry from your account settings.",
  });
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