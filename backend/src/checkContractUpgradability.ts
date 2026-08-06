import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";
import dotenv from "dotenv";

dotenv.config();

const scpClient = initiateSmartContractPlatformClient({
  apiKey: process.env.CIRCLE_API_KEY as string,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET as string,
});

async function main() {
  const contracts = await scpClient.listContracts({ blockchain: "ARC-TESTNET" });
  const ours = contracts.data?.contracts?.find(
    (c: any) => c.contractAddress?.toLowerCase() === (process.env.RELAY_RECEIPT_CONTRACT_ADDRESS as string).toLowerCase()
  );

  if (!ours) {
    console.error("Contract not found");
    return;
  }

  const full = await scpClient.getContract({ id: ours.id });

  console.log("=== RAW sourceCode field, exactly as returned ===");
  console.log(JSON.stringify(full.data?.contract?.sourceCode));
}

main().catch(console.error);