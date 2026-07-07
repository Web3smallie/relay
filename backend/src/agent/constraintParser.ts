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
};

const SYSTEM_PROMPT = `You extract structured shopping constraints from a natural language purchase request.

Respond ONLY with a JSON object, no other text, no markdown formatting, matching this exact shape:
{
  "productQuery": string,       // the core product being searched for, e.g. "snowboard", "gaming mouse"
  "maxPrice": number | null,    // maximum price in USD, or null if not specified
  "deliveryDeadline": string | null,  // a plain description like "Friday" or "3 days", or null if not specified
  "minRating": number | null,   // minimum acceptable rating out of 5, or null if not specified
  "notes": string | null        // any other relevant constraint not covered above, or null
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
    throw new Error("No text response from C  throw new Error(`Failed to parse Claude's response as JSON: ${textBlock.text}`);laude");
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