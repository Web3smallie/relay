import { Router } from "express";
import { bridgeUsdcForUser } from "../bridgeUsdc";

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

export default router;