import type { Diet } from "@/lib/catalog";
import { findOccasion } from "./occasions";
import { findRecipeByName } from "./recipes";
import type { ShoppingIntent } from "./types";

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, couple: 2, dozen: 12,
};

const DIET_PATTERNS: { diet: Diet; pattern: RegExp }[] = [
  { diet: "veg", pattern: /\b(veg|vegetarian|no meat|meat free|jain|sattvic|pure veg)\b/i },
  { diet: "nonveg", pattern: /\b(non[- ]?veg|chicken|mutton|fish|prawn|meat|egg and meat)\b/i },
  { diet: "egg", pattern: /\b(eggetarian|egg only|with egg)\b/i },
];

const NOTE_PATTERNS: { note: string; pattern: RegExp }[] = [
  { note: "No onion or garlic", pattern: /\b(no onion|without onion|jain|no garlic)\b/i },
  { note: "Keep it light", pattern: /\b(light|healthy|low oil|low cal|diet)\b/i },
  { note: "Make it spicy", pattern: /\b(spicy|extra spicy|hot)\b/i },
  { note: "High protein", pattern: /\b(protein|high[- ]protein|gym|workout)\b/i },
  { note: "Kid friendly", pattern: /\b(kids?|children|child)\b/i },
  { note: "Quick to cook", pattern: /\b(quick|fast|15 min|20 min|in a hurry|no time)\b/i },
];

function extractPeople(text: string): number | null {
  const patterns = [
    /\bfor\s+(\d{1,2})\s*(?:people|persons?|pax|guests?|of us|heads?)?\b/i,
    /\b(\d{1,2})\s*(?:people|persons?|pax|guests?|servings?|portions?)\b/i,
    /\bserves?\s+(\d{1,2})\b/i,
    /\bhosting\s+(\d{1,2})\b/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const value = Number.parseInt(match[1], 10);
      if (value >= 1 && value <= 50) return value;
    }
  }

  const wordPattern = new RegExp(`\\b(?:for|serves?|hosting)\\s+(${Object.keys(NUMBER_WORDS).join("|")})\\b`, "i");
  const wordMatch = wordPattern.exec(text);
  if (wordMatch) return NUMBER_WORDS[wordMatch[1].toLowerCase()];

  if (/\bmyself\b|\bjust me\b|\bfor one\b|\bsolo\b/i.test(text)) return 1;
  return null;
}

function extractBudget(text: string): number | null {
  const patterns = [
    /(?:under|below|within|less than|max|upto|up to|budget of|budget)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)\s*(k)?/i,
    /(?:₹|rs\.?|inr)\s*([\d,]+)\s*(k)?\s*(?:budget|max|or less)?/i,
    /\bbudget\s*[:\-]?\s*(?:₹|rs\.?)?\s*([\d,]+)\s*(k)?/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const raw = Number.parseInt(match[1].replace(/,/g, ""), 10);
      if (!Number.isFinite(raw)) continue;
      const value = match[2] ? raw * 1000 : raw;
      if (value >= 50 && value <= 100000) return value;
    }
  }
  return null;
}

function extractDiet(text: string): Diet | null {
  // Non-veg mentions win only when no explicit vegetarian ask is present.
  const vegHit = DIET_PATTERNS[0].pattern.test(text);
  if (vegHit) return "veg";
  if (DIET_PATTERNS[2].pattern.test(text)) return "egg";
  if (DIET_PATTERNS[1].pattern.test(text)) return "nonveg";
  return null;
}

function extractNotes(text: string): string[] {
  return NOTE_PATTERNS.filter((entry) => entry.pattern.test(text)).map((entry) => entry.note);
}

/**
 * Deterministic reading of a shopper's sentence. Runs on its own when no model
 * is configured, and as the safety net whenever the model call fails.
 */
export function parseIntentWithRules(raw: string): ShoppingIntent {
  const text = raw.trim();
  const recipe = findRecipeByName(text);
  const occasion = findOccasion(text);
  const people = extractPeople(text);
  const budget = extractBudget(text);
  const diet = extractDiet(text);
  const notes = extractNotes(text);

  let kind: ShoppingIntent["kind"] = "unknown";
  if (recipe) kind = "dish";
  else if (occasion) kind = occasion.id === "party" || occasion.id === "movie-night" ? "occasion" : "meal";
  else if (/\b(weekly|monthly|restock|groceries|essentials|stock up)\b/i.test(text)) kind = "restock";

  return {
    raw: text,
    kind,
    dish: recipe ? recipe.name : null,
    occasion: occasion ? occasion.id : null,
    people: people ?? defaultPeople(kind, occasion?.id),
    budget,
    diet: diet ?? (recipe ? recipe.diet : null),
    notes,
    source: "rules",
  };
}

function defaultPeople(kind: ShoppingIntent["kind"], occasionId?: string): number {
  if (occasionId === "party") return 6;
  if (occasionId === "movie-night") return 3;
  if (kind === "restock") return 2;
  return 2;
}

/** Normalises whatever the model returned into a trustworthy intent. */
export function coerceIntent(raw: string, candidate: unknown): ShoppingIntent | null {
  if (!candidate || typeof candidate !== "object") return null;
  const value = candidate as Record<string, unknown>;

  const people = Number(value.people);
  const budget = value.budget === null || value.budget === undefined ? null : Number(value.budget);
  const diet = typeof value.diet === "string" && ["veg", "egg", "nonveg"].includes(value.diet)
    ? (value.diet as Diet)
    : null;
  const kind = typeof value.kind === "string" && ["dish", "meal", "occasion", "restock", "unknown"].includes(value.kind)
    ? (value.kind as ShoppingIntent["kind"])
    : "unknown";

  return {
    raw,
    kind,
    dish: typeof value.dish === "string" && value.dish.trim() ? value.dish.trim() : null,
    occasion: typeof value.occasion === "string" && value.occasion.trim() ? value.occasion.trim() : null,
    people: Number.isFinite(people) && people >= 1 && people <= 50 ? Math.round(people) : 2,
    budget: budget !== null && Number.isFinite(budget) && budget > 0 ? Math.round(budget) : null,
    diet,
    notes: Array.isArray(value.notes) ? value.notes.filter((n): n is string => typeof n === "string").slice(0, 4) : [],
    source: "llm",
  };
}
