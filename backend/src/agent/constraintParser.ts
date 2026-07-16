import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type PurchaseConstraints = {
  productQuery: string;
  maxPrice: number | null;
  deliveryDeadline: string | null;
  minRating: number | null;
  notes: string | null;
  deliveryLabel: string | null;
  inlineAddress: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
};

const SYSTEM_PROMPT = `You extract structured shopping constraints from a natural language purchase request.

Respond ONLY with a JSON object, no other text, no markdown formatting, matching this exact shape:
{
  "productQuery": string,       // the core product being searched for, e.g. "snowboard", "gaming mouse"
  "maxPrice": number | null,    // maximum price in USD, or null if not specified
  "deliveryDeadline": string | null,  // a plain description like "Friday" or "3 days", or null if not specified
  "minRating": number | null,   // minimum acceptable rating out of 5, or null if not specified
  "notes": string | null,       // any other relevant constraint not covered above, or null
  "deliveryLabel": string | null,  // where to ship it, normalized to a short lowercase label like "home", "office", "mum" — extracted from phrases like "send it to my home" or "deliver to my office". null if not mentioned.
  "inlineAddress": string | null,  // if the user gave a full, specific street address directly in the request, put the complete raw address text here as given. null if they only mentioned a label like "home" without giving the actual address.
  "street": string | null,   // if inlineAddress is set, the street number + name only, e.g. "23 Demo Street". null otherwise.
  "city": string | null,     // if inlineAddress is set, the city. null otherwise.
  "state": string | null,    // if inlineAddress is set, the state/province, abbreviated if it's a US state (e.g. "NY"). null otherwise.
  "zip": string | null,      // if inlineAddress is set, the postal/zip code. null otherwise.
  "country": string | null   // if inlineAddress is set, the 2-letter country code (e.g. "US"). Default to "US" if a full US-style address is given but country isn't explicit. null if inlineAddress is null.
}`;

export async function parseConstraints(request: string): Promise<PurchaseConstraints> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: request }],
  });

  const textBlock = message.content.find((block) => block.type === "text");

  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const cleanedText = textBlock.text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleanedText);
  } catch {
    throw new Error(`Failed to parse Claude's response as JSON: ${cleanedText}`);
  }
}

// constraintParser.ts — add this below the existing parseConstraints function
// (everything above it, including PurchaseConstraints and parseConstraints, is unchanged)

const ADDRESS_SYSTEM_PROMPT = `You extract a structured mailing address from free text.

Respond ONLY with a JSON object, no other text, no markdown formatting, matching this exact shape:
{
  "street": string | null,   // street number + name, e.g. "23 Demo Street"
  "city": string | null,
  "state": string | null,    // abbreviated if a US state, e.g. "NY"
  "zip": string | null,
  "country": string | null   // 2-letter code, e.g. "US". Default to "US" if not stated but the format looks like a US address.
}`;

export type ParsedAddress = {
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
};

export async function parseAddress(addressText: string): Promise<ParsedAddress> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 300,
    system: ADDRESS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: addressText }],
  });

  const textBlock = message.content.find((block) => block.type === "text");

  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const cleanedText = textBlock.text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleanedText);
  } catch {
    throw new Error(`Failed to parse Claude's response as JSON: ${cleanedText}`);
  }
}