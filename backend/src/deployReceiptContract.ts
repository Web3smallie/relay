import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";
import dotenv from "dotenv";

dotenv.config();

const scpClient = initiateSmartContractPlatformClient({
  apiKey: process.env.CIRCLE_API_KEY as string,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET as string,
});

const NFT_TEMPLATE_ID = "76b83278-50e2-4006-8b63-5b1a2a814533";

async function main() {
  const walletId = process.env.RELAY_TREASURY_CIRCLE_WALLET_ID as string;
  const walletAddress = process.env.RELAY_TREASURY_ADDRESS as string;

  console.log("Deploying Relay Receipt NFT contract...");

  const deployment = await scpClient.deployContractTemplate({
    id: NFT_TEMPLATE_ID,
    blockchain: "ARC-TESTNET",
    name: "RelayReceipt",
    walletId,
    templateParameters: {
      name: "Relay Purchase Receipt",
      defaultAdmin: walletAddress,
      primarySaleRecipient: walletAddress,
      royaltyRecipient: walletAddress,
      royaltyPercent: 0,
    },
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });

  console.log("Deployment initiated, full raw response:", JSON.stringify(deployment.data, null, 2));

  const contractId = deployment.data?.contractIds?.[0];
  if (!contractId) {
    throw new Error("No contractId returned from deployment");
  }

  console.log("Polling for deployment to complete...");
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const status = await scpClient.getContract({ id: contractId });
    console.log(`Attempt ${i + 1}, full raw contract object:`, JSON.stringify(status.data, null, 2));
  }
}

main().catch(console.error);