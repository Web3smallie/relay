// backend/src/core/acp/DigitalCommerceCategories.ts
//
// The full list of digital-first commerce categories Relay is designed
// to eventually support. This is a TYPE-LEVEL extension point only —
// no category has a real provider integration yet. Adding a real
// integration later means implementing DigitalCommerceProvider for
// that one category, not touching this list's structure.

export type DigitalCommerceCategory =
  | "gift_cards"
  | "airtime"
  | "data_bundles"
  | "saas_subscriptions"
  | "ai_subscriptions"
  | "x_premium"
  | "cloud_services"
  | "vps_cloud_servers"
  | "rdp_services"
  | "domains"
  | "ssl_certificates"
  | "api_credits"
  | "developer_tools"
  | "hosting"
  | "cdn_services"
  | "vpn_subscriptions"
  | "software_licenses"
  | "digital_products"
  | "productivity_software"
  | "streaming_subscriptions"
  | "gaming_credits"
  | "education_platforms";

// A future real provider (e.g. a gift card API) implements this for
// its one category. No provider exists yet for any category.
export interface DigitalCommerceProvider {
  category: DigitalCommerceCategory;
  search(query: string): Promise<unknown[]>;
  purchase(itemId: string): Promise<unknown>;
}