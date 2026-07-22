// backend/src/core/acp/ReloadlyACP.ts
//
// Adapts the working ReloadlyAdapter to the ACP interface. Airtime
// doesn't naturally fit the "search a catalog, checkout a product"
// shape ACP was designed around (that's a Saleor-shaped assumption),
// so this mapping is repurposed and clearly documented rather than
// forcing a bad fit silently:
//
//   search()   -> detects which mobile operator a phone number belongs
//                 to. `params.query` must be "phoneNumber:countryCode"
//                 (e.g. "2348137277653:NG"). Returns one pseudo-Product
//                 representing that operator.
//   checkout() -> sends the actual top-up.
//                 `productId` = "phoneNumber:countryCode" (same format)
//                 `quantity`  = the top-up amount in USD, NOT a literal
//                               quantity — this is Reloadly-specific.
//
// ReloadlyAdapter.ts itself is not modified.

import { detectOperator, sendTopup } from "../../merchants/ReloadlyAdapter";
import { ACP, ACPSearchParams, ACPCheckoutResult } from "./ACP";
import { Product } from "../../merchants/MerchantAdapter";

function parsePhoneCountry(value: string): { phoneNumber: string; countryCode: string } {
  const [phoneNumber, countryCode] = value.split(":");
  if (!phoneNumber || !countryCode) {
    throw new Error('ReloadlyACP expects "phoneNumber:countryCode", e.g. "2348137277653:NG"');
  }
  return { phoneNumber, countryCode };
}

export class ReloadlyACP implements ACP {
  async search(params: ACPSearchParams): Promise<Product[]> {
    const { phoneNumber, countryCode } = parsePhoneCountry(params.query);
    const operator = await detectOperator(phoneNumber, countryCode);

    return [
      {
        id: `${phoneNumber}:${countryCode}`,
        title: `Airtime top-up — ${operator.name}`,
        price: params.maxPrice ?? operator.minAmount,
        currency: "USD",
        imageUrl: null,
        productUrl: "",
        available: true,
      },
    ];
  }

  async checkout(
    productId: string,
    quantity: number,
    payerAddress?: string,
    email?: string,
    resolvedAddress?: unknown
  ): Promise<ACPCheckoutResult> {
    const { phoneNumber, countryCode } = parsePhoneCountry(productId);
    const operator = await detectOperator(phoneNumber, countryCode);

    const result = await sendTopup(operator.operatorId, quantity, countryCode, phoneNumber);

    return { checkoutId: String(result.transactionId), totalPrice: quantity };
  }
}