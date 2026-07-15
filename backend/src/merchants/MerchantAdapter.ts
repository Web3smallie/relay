// The common interface every merchant integration must implement.
// Relay Core only ever talks to this interface — never to Shopify (or any
// other merchant) directly.

export type ProductSearchParams = {
  query: string;
  maxPrice?: number;
};

export type Product = {
  id: string;
  title: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  productUrl: string;
  available: boolean;
};

export interface MerchantAdapter {
  search(params: ProductSearchParams): Promise<Product[]>;
}

export interface MerchantAdapter {
  search(params: ProductSearchParams): Promise<Product[]>;
  checkout(
  productId: string,
  quantity: number,
  payerAddress?: string,
  email?: string
): Promise<{ checkoutUrl: string }>;
}