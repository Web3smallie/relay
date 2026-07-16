import { GraphQLClient, gql } from "graphql-request";
import dotenv from "dotenv";
import { MerchantAdapter, Product, ProductSearchParams } from "./MerchantAdapter";

dotenv.config();

const apiUrl = process.env.SALEOR_API_URL as string;
const appToken = process.env.SALEOR_APP_TOKEN as string;

if (!apiUrl || !appToken) {
  throw new Error("Missing Saleor environment variables");
}

const client = new GraphQLClient(apiUrl, {
  headers: { Authorization: `Bearer ${appToken}` },
});

const CHANNEL = "default-channel";

const SEARCH_QUERY = gql`
  query SearchProducts($filter: ProductFilterInput, $channel: String!) {
    products(first: 10, filter: $filter, channel: $channel) {
      edges {
        node {
          id
          name
          thumbnail {
            url
          }
          pricing {
            priceRange {
              start {
                gross {
                  amount
                  currency
                }
              }
            }
          }
          variants {
            id
            quantityAvailable
          }
        }
      }
    }
  }
`;

const CHECKOUT_CREATE_MUTATION = gql`
  mutation CheckoutCreate($input: CheckoutCreateInput!) {
    checkoutCreate(input: $input) {
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

type SaleorProductNode = {
  id: string;
  name: string;
  thumbnail: { url: string } | null;
  pricing: {
    priceRange: {
      start: { gross: { amount: number; currency: string } };
    };
  } | null;
  variants: { id: string; quantityAvailable: number | null }[];
};

// Shape of a resolved address row coming from Supabase (see executePurchaseSearch.ts).
// Old rows saved before the address-structure fix may only have `street` populated —
// every field is optional so we can fall back gracefully instead of crashing.
export type ResolvedAddress = {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

const PLACEHOLDER_ADDRESS = {
  streetAddress1: "123 Demo Street",
  city: "New York",
  countryArea: "NY",
  postalCode: "10001",
  country: "US",
};

function buildAddressInput(resolvedAddress?: ResolvedAddress | null) {
  if (!resolvedAddress) {
    return PLACEHOLDER_ADDRESS;
  }

  // Fill each field from the resolved address if present, otherwise fall back
  // to the placeholder value for that field only — so a partially-populated
  // old row still produces a valid Saleor address instead of failing.
  return {
    streetAddress1: resolvedAddress.street ?? PLACEHOLDER_ADDRESS.streetAddress1,
    city: resolvedAddress.city ?? PLACEHOLDER_ADDRESS.city,
    countryArea: resolvedAddress.state ?? PLACEHOLDER_ADDRESS.countryArea,
    postalCode: resolvedAddress.postal_code ?? PLACEHOLDER_ADDRESS.postalCode,
    country: resolvedAddress.country ?? PLACEHOLDER_ADDRESS.country,
  };
}

export class SaleorAdapter implements MerchantAdapter {
  async search(params: ProductSearchParams): Promise<Product[]> {
    const filter = params.query ? { search: params.query } : {};

    const data = await client.request<{
      products: { edges: { node: SaleorProductNode }[] };
    }>(SEARCH_QUERY, { filter, channel: CHANNEL });

    const products: Product[] = data.products.edges.map(({ node }) => {
      const firstVariant = node.variants[0];
      const price = node.pricing?.priceRange.start.gross.amount ?? 0;
      const currency = node.pricing?.priceRange.start.gross.currency ?? "USD";
      const available = (firstVariant?.quantityAvailable ?? 0) > 0;

      return {
        id: node.id,
        title: node.name,
        price,
        currency,
        imageUrl: node.thumbnail?.url ?? null,
        productUrl: "",
        available,
      };
    });

    if (params.maxPrice !== undefined) {
      return products.filter((p) => p.price <= params.maxPrice!);
    }

    return products;
  }

  async checkout(
    productId: string,
    quantity: number,
    payerAddress?: string,
    email?: string,
    resolvedAddress?: ResolvedAddress | null
  ): Promise<{ checkoutUrl: string }> {
    // Saleor checkout lines need a Variant ID — fetch the product's first variant
    const variantQuery = gql`
      query GetVariant($id: ID!, $channel: String!) {
        product(id: $id, channel: $channel) {
          variants {
            id
          }
        }
      }
    `;

    const variantData = await client.request<{
      product: { variants: { id: string }[] } | null;
    }>(variantQuery, { id: productId, channel: CHANNEL });

    const variantId = variantData.product?.variants[0]?.id;

    if (!variantId) {
      throw new Error("Could not find a purchasable variant for this product");
    }

    const addressInput = buildAddressInput(resolvedAddress);

    const result = await client.request<{
      checkoutCreate: {
        checkout: { id: string } | null;
        errors: { field: string; message: string }[];
      };
    }>(CHECKOUT_CREATE_MUTATION, {
      input: {
        channel: CHANNEL,
        email: email ?? "test-buyer@relay-demo.com",
        lines: [{ quantity, variantId }],
        metadata: payerAddress ? [{ key: "payerAddress", value: payerAddress }] : [],
        shippingAddress: {
          firstName: "Relay",
          lastName: "Demo",
          ...addressInput,
        },
        billingAddress: {
          firstName: "Relay",
          lastName: "Demo",
          ...addressInput,
        },
      },
    });

    if (result.checkoutCreate.errors.length > 0 || !result.checkoutCreate.checkout) {
      throw new Error(
        `Saleor checkout creation failed: ${JSON.stringify(result.checkoutCreate.errors)}`
      );
    }

    // Saleor doesn't generate a hosted checkout URL by default the way Shopify does —
    // this returns the checkout ID, which our own frontend/checkout flow will use directly.
    return { checkoutUrl: result.checkoutCreate.checkout.id };
  }
}