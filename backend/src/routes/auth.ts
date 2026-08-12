import { Router } from "express";
import { supabase } from "../supabaseClient";
import { supabaseAdmin } from "../supabaseAdmin";
import { createWallet } from "../wallet";
import { getOrCreateChainWallet } from "../chainWallets";

const router = Router();
const CCTP_FUNDING_CHAINS = [
  "ETH-SEPOLIA",
  "ARB-SEPOLIA",
  "BASE-SEPOLIA",
  "OP-SEPOLIA",
  "AVAX-FUJI",
];

// Sign up a new user — creates auth account, profile, and wallet in one step
router.post("/signup", async (req, res) => {
  const { email, password, fullName, phone } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const userId = data.user?.id;
  let walletCreated = false;
  let cctpWalletsCreated = 0;

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

        // Provision every CCTP funding wallet in parallel. A failure on one
        // optional chain must not block account creation or the Arc wallet.
        const cctpResults = await Promise.allSettled(
          CCTP_FUNDING_CHAINS.map((blockchain) => getOrCreateChainWallet(userId, blockchain))
        );

        cctpWalletsCreated = cctpResults.filter((result) => result.status === "fulfilled").length;
        cctpResults.forEach((result, index) => {
          if (result.status === "rejected") {
            console.error(`Failed to create ${CCTP_FUNDING_CHAINS[index]} wallet:`, result.reason);
          }
        });
      }
    } catch (walletCreationError) {
      console.error("Failed to create wallet:", walletCreationError);
    }
  }

  res.json({
    user: data.user,
    session: data.session,
    walletCreated,
    cctpWalletsCreated,
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
