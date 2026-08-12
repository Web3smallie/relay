import { Router } from "express";
import { supabase } from "../supabaseClient";
import { supabaseAdmin } from "../supabaseAdmin";
import { createCctpFundingWallets, createWallet } from "../wallet";

const router = Router();

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

        try {
          // Create all funding wallets in one batch so they share one EVM
          // address across Ethereum Sepolia, Base, Arbitrum, Optimism, and Fuji.
          const cctpWallets = await createCctpFundingWallets(userId);
          const { error: cctpSaveError } = await supabaseAdmin.from("user_chain_wallets").insert(
            cctpWallets.map((wallet) => ({
              user_id: userId,
              blockchain: wallet.blockchain,
              circle_wallet_id: wallet.circleWalletId,
              address: wallet.address,
            }))
          );

          if (cctpSaveError) {
            console.error("Failed to save CCTP funding wallets:", cctpSaveError.message);
          } else {
            cctpWalletsCreated = cctpWallets.length;
          }
        } catch (cctpWalletError) {
          // Arc wallet setup and signup still succeed. The existing on-demand
          // wallet creation remains as a fallback for a later bridge.
          console.error("Failed to create CCTP funding wallets:", cctpWalletError);
        }
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
