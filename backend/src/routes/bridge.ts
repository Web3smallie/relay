import { Router } from "express";
import { bridgeUsdcForUser } from "../bridgeUsdc";
import { supabaseAdmin } from "../supabaseAdmin";

const router = Router();

const SUPPORTED_CHAINS = ["ARC-TESTNET", "ETH-SEPOLIA", "ARB-SEPOLIA", "BASE-SEPOLIA", "OP-SEPOLIA", "AVAX-FUJI"];

function safeSerialize(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) => (typeof value === "bigint" ? value.toString() : value))
  );
}

router.post("/bridge", async (req, res) => {
  try {
    const { userId, sourceChain, destinationChain, amount } = req.body;

    const source = sourceChain || "ARC-TESTNET"; // defaults to Arc as source, backward-compatible

    if (!userId || !destinationChain || !amount) {
      return res.status(400).json({ error: "userId, destinationChain, and amount are required" });
    }

    if (!SUPPORTED_CHAINS.includes(source) || !SUPPORTED_CHAINS.includes(destinationChain)) {
      return res.status(400).json({
        error: `Unsupported chain. Supported: ${SUPPORTED_CHAINS.join(", ")}`,
      });
    }

    if (source === destinationChain) {
      return res.status(400).json({ error: "sourceChain and destinationChain must differ" });
    }

    const result = await bridgeUsdcForUser(userId, source, destinationChain, amount.toString());

    console.log("Full bridge result steps:", JSON.stringify(safeSerialize(result.steps), null, 2));

    res.json(
      safeSerialize({
        status: result.state,
        amount: result.amount,
        sourceChain: source,
        destinationChain,
        destinationAddress: result.destination.address,
        steps: result.steps,
      })
    );
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get("/bridge/supported-chains", (req, res) => {
  res.json({ chains: SUPPORTED_CHAINS });
});

// New users receive unified CCTP wallets at signup. Existing wallets are only
// read here: do not replace an address that may already hold user funds.
router.get("/cctp-wallets/:userId", async (req, res) => {
  try {
    const fundingChains = SUPPORTED_CHAINS.filter((chain) => chain !== "ARC-TESTNET");
    const { data, error } = await supabaseAdmin
      .from("user_chain_wallets")
      .select("blockchain, address")
      .eq("user_id", req.params.userId)
      .in("blockchain", fundingChains);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ wallets: data ?? [], supportedChains: fundingChains });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
