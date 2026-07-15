import { GraphQLClient, gql } from "graphql-request";
import dotenv from "dotenv";

dotenv.config();

const apiUrl = process.env.SALEOR_API_URL as string;
const appToken = process.env.SALEOR_APP_TOKEN as string;
const APP_ID = "QXBwOjQ="; // Relay's Saleor App ID

const client = new GraphQLClient(apiUrl, {
  headers: { Authorization: `Bearer ${appToken}` },
});

const TRANSACTION_INITIALIZE_MUTATION = gql`
  mutation TransactionInitialize($id: ID!, $paymentGateway: PaymentGatewayToInitialize!, $amount: PositiveDecimal!) {
    transactionInitialize(id: $id, paymentGateway: $paymentGateway, amount: $amount) {
      transaction {
        id
      }
      data
      errors {
        field
        message
      }
    }
  }
`;

const CHECKOUT_TOTAL_QUERY = gql`
  query GetCheckoutTotal($id: ID!) {
    checkout(id: $id) {
      totalPrice {
        gross {
          amount
        }
      }
    }
  }
`;

export type PaymentInitiationResult = {
  transactionId: string;
  treasuryAddress: string;
  expectedAmount: number;
};

/**
 * Starts the payment process for a checkout: gets the real total,
 * initializes a transaction with Relay's payment app, and returns
 * everything the caller needs to actually send the USDC payment.
 */
export async function initiatePayment(checkoutId: string): Promise<PaymentInitiationResult> {
  const totalData = await client.request<{
    checkout: { totalPrice: { gross: { amount: number } } } | null;
  }>(CHECKOUT_TOTAL_QUERY, { id: checkoutId });

  const amount = totalData.checkout?.totalPrice.gross.amount;

  if (amount === undefined) {
    throw new Error("Could not determine checkout total");
  }

  const result = await client.request<{
    transactionInitialize: {
      transaction: { id: string } | null;
      data: { treasuryAddress: string; expectedAmount: number } | null;
      errors: { field: string; message: string }[];
    };
  }>(TRANSACTION_INITIALIZE_MUTATION, {
    id: checkoutId,
    paymentGateway: { id: APP_ID },
    amount,
  });

  if (result.transactionInitialize.errors.length > 0 || !result.transactionInitialize.transaction) {
    throw new Error(
      `Transaction initialize failed: ${JSON.stringify(result.transactionInitialize.errors)}`
    );
  }

  return {
    transactionId: result.transactionInitialize.transaction.id,
    treasuryAddress: result.transactionInitialize.data?.treasuryAddress ?? "",
    expectedAmount: amount,
  };
}