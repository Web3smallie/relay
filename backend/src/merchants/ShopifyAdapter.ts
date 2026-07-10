import { createStorefrontApiClient } from "@shopify/storefront-api-client";
import dotenv from "dotenv";
import { MerchantAdapter, Product, ProductSearchParams } from "./MerchantAdapter";

dotenv.config();

const storeDomain = process.env.SHOPIFY_STORE_DOMAIN as string;
const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN as string;

if (!storeDomain || !storefrontToken) {
  throw new Error("Missing Shopify environment variables");
}

const client = createStorefrontApiClient({
  storeDomain: `https://${storeDomain}`,
  apiVersion: "2026-01",
  publicAccessToken: storefrontToken,
});

const SEARCH_QUERY = `
  query SearchProducts($query: String!) {
    products(first: 10, query: $query) {
      edges {
        node {
          id
          title
          availableForSale
          featuredImage {
            url
          }
          onlineStoreUrl
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

const CART_CREATE_MUTATION = `
  mutation CartCreate($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart {
        id
        checkoutUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const VARIANT_QUERY = `
  query GetVariant($id: ID!) {
    product(id: $id) {
      variants(first: 1) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`;

export class ShopifyAdapter implements MerchantAdapter {
  async search(params: ProductSearchParams): Promise<Product[]> {
    const formattedQuery = params.query ? `title:*${params.query}*` : "";

    const { data, errors } = await client.request(SEARCH_QUERY, {
      variables: { query: formattedQuery },
    });

    if (errors) {
      throw new Error(`Shopify search failed: ${JSON.stringify(errors)}`);
    }

    const products: Product[] = data.products.edges.map((edge: any) => {
      const node = edge.node;
      return {
        id: node.id,
        title: node.title,
        price: parseFloat(node.priceRange.minVariantPrice.amount),
        currency: node.priceRange.minVariantPrice.currencyCode,
        imageUrl: node.featuredImage?.url ?? null,
        productUrl: node.onlineStoreUrl ?? "",
        available: node.availableForSale,
      };
    });

    // Apply the maxPrice filter ourselves, since Shopify's search query
    // syntax for price filtering is limited — safer to filter in code.
    if (params.maxPrice !== undefined) {
      return products.filter((p) => p.price <= params.maxPrice!);
    }

    return products;
  }

  async checkout(productId: string, quantity: number): Promise<{ checkoutUrl: string }> {
    // productId is a Product ID (gid://shopify/Product/...), but cart lines
    // need a Variant ID — fetch the default variant first.
    const { data: variantData, errors: variantErrors } = await client.request(VARIANT_QUERY, {
      variables: { id: productId },
    });

    if (variantErrors || !variantData?.product?.variants?.edges?.length) {
      throw new Error("Could not find a purchasable variant for this product");
    }

    const variantId = variantData.product.variants.edges[0].node.id;

    const { data, errors } = await client.request(CART_CREATE_MUTATION, {
      variables: { lines: [{ merchandiseId: variantId, quantity }] },
    });

    if (errors || data.cartCreate.userErrors.length > 0) {
      throw new Error(
        `Checkout creation failed: ${JSON.stringify(errors || data.cartCreate.userErrors)}`
      );
    }

    return { checkoutUrl: data.cartCreate.cart.checkoutUrl };
  }
}