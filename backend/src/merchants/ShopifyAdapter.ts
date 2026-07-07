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
  apiVersion: "2025-01",
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
}