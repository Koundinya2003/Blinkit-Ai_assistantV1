import { INGREDIENT_KEYS } from "@/lib/catalog";
import { OCCASIONS } from "./occasions";
import { RECIPES } from "./recipes";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 14_000;

export type LlmDish = {
  name: string;
  servings: number;
  minutes?: number;
  ingredients: {
    key: string;
    label: string;
    quantity: number;
    unit: "g" | "ml" | "piece";
    optional?: boolean;
    note?: string;
  }[];
};

export type LlmPlan = {
  intent: {
    kind: string;
    dish: string | null;
    occasion: string | null;
    people: number;
    budget: number | null;
    diet: string | null;
    notes: string[];
  };
  title: string;
  summary: string;
  dishes: LlmDish[];
};

export function isLlmConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function systemPrompt(): string {
  return [
    "You are the planning brain behind Blinkit's intent-to-basket feature for Indian quick commerce.",
    "A shopper describes an outcome. You return the cooking plan and the ingredient requirements for it.",
    "",
    "Hard rules:",
    "- You never name products, brands or prices. A separate service maps ingredients to real Blinkit packs.",
    "- Quantities are TOTALS for the whole head count, in grams (g), millilitres (ml) or pieces (piece).",
    "- Spices, masalas and condiments: use unit 'piece' with quantity 1, meaning one retail pack.",
    "- Respect the diet: 'veg' means no meat, fish or egg; 'egg' allows egg but no meat.",
    "- Prefer everyday Indian home cooking. Keep a plan to at most 5 dishes and 16 distinct ingredients.",
    "- If a budget is given, choose dishes that can plausibly be cooked within it.",
    "",
    `Use these canonical ingredient keys wherever one fits: ${INGREDIENT_KEYS.join(", ")}.`,
    "If nothing fits, invent a lowercase-hyphenated key and give an accurate human label.",
    "",
    `Known dishes (reuse these names when they apply): ${RECIPES.map((r) => r.name).join(", ")}.`,
    `Known occasions: ${OCCASIONS.map((o) => o.id).join(", ")}.`,
    "",
    "Reply with JSON only, matching:",
    '{"intent":{"kind":"dish|meal|occasion|restock|unknown","dish":string|null,"occasion":string|null,"people":number,"budget":number|null,"diet":"veg"|"egg"|"nonveg"|null,"notes":string[]},',
    '"title":string,"summary":string,',
    '"dishes":[{"name":string,"servings":number,"minutes":number,"ingredients":[{"key":string,"label":string,"quantity":number,"unit":"g"|"ml"|"piece","optional":boolean,"note":string}]}]}',
  ].join("\n");
}

function extractJson(content: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(content);
  const body = fenced ? fenced[1] : content;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Asks the model for a plan. Returns null on any failure — every caller has a
 * deterministic path that produces a usable basket without it.
 */
export async function requestPlan(query: string): Promise<LlmPlan | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Blinkit Intent to Basket",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-haiku",
        temperature: 0.2,
        max_tokens: 1600,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: query },
        ],
      }),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = extractJson(content);
    return isPlanShaped(parsed) ? parsed : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isPlanShaped(value: unknown): value is LlmPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Record<string, unknown>;
  if (!Array.isArray(plan.dishes) || plan.dishes.length === 0) return false;
  return plan.dishes.every((dish) => {
    if (!dish || typeof dish !== "object") return false;
    const entry = dish as Record<string, unknown>;
    return typeof entry.name === "string" && Array.isArray(entry.ingredients) && entry.ingredients.length > 0;
  });
}
