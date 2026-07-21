import { supabaseAdmin } from "../supabaseAdmin";
import { parseConstraints, PurchaseConstraints } from "./constraintParser";
import { SaleorACP } from "../core/acp/SaleorACP";
import { Product } from "../merchants/MerchantAdapter";
import { GraphQLClient, gql } from "graphql-request";
import dotenv from "dotenv";

dotenv.config();

const apiUrl = process.env.SALEOR_API_URL as string;
const appToken = process.env.SALEOR_APP_TOKEN as string;

const client = new GraphQLClient(apiUrl, {
  headers: { Authorization: `Bearer ${appToken}` },
});

const SET_SHIPPING_MUTATION = gql`
  mutation SetShipping($id: ID!, $shippingMethodId: ID!) {
    checkoutShippingMethodUpdate(id: $id, shippingMethodId: $shippingMethodId) {
      checkout {
        id
      }
      errors {
        field
        message
      }
    }
  }
`;

const GET_SHIPPING_METHODS_QUERY = gql`
  query GetShippingMethods($id: ID!) {
    checkout(id: $id) {
      shippingMethods {
        id
        name
      }
      totalPrice {
        gross {
          amount
        }
      }
    }
  }
`;

export type Recommendation = {
  product: Product;
  reasons: string[];
  checkoutId: string | null;
  totalPrice: number | null;
};

export type PurchaseSearchResult = {
  constraints: PurchaseConstraints;
  totalFound: number;
  recommendation: Recommendation | null;
  alternatives: Product[];
  needsAddress: string | null; // if set, this is the label we need an address for
};

function buildReasons(
  product: Product,
  constraints: PurchaseConstraints,
  isCheapest: boolean
): string[] {
  const reasons: string[] = [];
  if (isCheapest) reasons.push("Lowest price among matching results");
  if (constraints.maxPrice !== null && product.price <= constraints.maxPrice) {
    reasons.push(`Within your budget of $${constraints.maxPrice}`);
  }
  reasons.push(`Matches "${constraints.productQuery}"`);
  reasons.push("Available for purchase");
  return reasons;
}

export async function searchWithConstraints(
  constraints: PurchaseConstraints,
  payerAddress?: string,
  userId?: string
): Promise<PurchaseSearchResult> {
  // If the request mentions a delivery label, check whether we have that address saved
  let resolvedAddress: any = null;

  if (constraints.deliveryLabel && userId) {
    const { data: addressRow } = await supabaseAdmin
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .ilike("label", constraints.deliveryLabel)
      .maybeSingle();

    if (addressRow) {
      resolvedAddress = addressRow;
    } else if (constraints.inlineAddress) {
      // User gave the full address inline — save it under this label using the
      // structured fields the parser extracted, not the raw blob
      const { data: newAddress } = await supabaseAdmin
        .from("addresses")
        .insert({
          user_id: userId,
          label: constraints.deliveryLabel,
          street: constraints.street,
          city: constraints.city,
          state: constraints.state,
          postal_code: constraints.zip,
          country: constraints.country,
        })
        .select()
        .single();

      resolvedAddress = newAddress;
    } else {
      return {
        constraints,
        totalFound: 0,
        recommendation: null,
        alternatives: [],
        needsAddress: constraints.deliveryLabel,
      };
    }
  }

  const adapter = new SaleorACP();
  const results = await adapter.search({
    query: constraints.productQuery,
    maxPrice: constraints.maxPrice ?? undefined,
  });

  const available = results.filter((p) => p.available);
  const sorted = available.sort((a, b) => a.price - b.price);

  if (sorted.length === 0) {
    return { constraints, totalFound: 0, recommendation: null, alternatives: [], needsAddress: null };
  }

  const [best, ...rest] = sorted;
  const reasons = buildReasons(best, constraints, true);

  let checkoutId: string | null = null;
  let totalPrice: number | null = null;

  try {
    const cart = await adapter.checkout(best.id, 1, payerAddress, undefined, resolvedAddress);
    checkoutId = cart.checkoutId; // ACP's return shape names this checkoutId (same value Saleor's checkoutUrl held)

    // Automatically select the first available shipping method
    const methodsData: any = await client.request(GET_SHIPPING_METHODS_QUERY, { id: checkoutId });
    const firstMethod = methodsData.checkout?.shippingMethods?.[0];

    if (firstMethod) {
      await client.request(SET_SHIPPING_MUTATION, {
        id: checkoutId,
        shippingMethodId: firstMethod.id,
      });
    }

    // Fetch the real total after shipping is applied
    const finalData: any = await client.request(GET_SHIPPING_METHODS_QUERY, { id: checkoutId });
    totalPrice = finalData.checkout?.totalPrice?.gross?.amount ?? best.price;
  } catch (err) {
    console.error("Checkout creation/shipping failed:", err);
  }

  return {
    constraints,
    totalFound: sorted.length,
    recommendation: { product: best, reasons, checkoutId, totalPrice },
    alternatives: rest,
    needsAddress: null,
  };
}

export async function executePurchaseSearch(request: string): Promise<PurchaseSearchResult> {
  const constraints = await parseConstraints(request);
  return searchWithConstraints(constraints);
}