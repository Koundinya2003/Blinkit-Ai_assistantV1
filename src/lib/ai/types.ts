import type { Diet, MeasureUnit, Product } from "@/lib/catalog";

export type IntentKind = "dish" | "meal" | "occasion" | "restock" | "unknown";

/** What the shopper actually asked for, once the words are stripped away. */
export type ShoppingIntent = {
  raw: string;
  kind: IntentKind;
  /** Named dish, when one was asked for: "chicken biryani". */
  dish: string | null;
  /** Meal slot or occasion: "dinner", "movie night", "house party". */
  occasion: string | null;
  people: number;
  budget: number | null;
  diet: Diet | null;
  /** Free-form extras the shopper mentioned: "no onion", "jain", "spicy". */
  notes: string[];
  /** Where the reading came from, so the UI can be honest about it. */
  source: "llm" | "rules";
};

export type IngredientScaling = "linear" | "sublinear" | "fixed";

/** One line of a recipe, expressed per serving. */
export type RecipeIngredient = {
  key: string;
  label: string;
  per: number;
  unit: MeasureUnit;
  scaling?: IngredientScaling;
  optional?: boolean;
  note?: string;
};

export type Recipe = {
  id: string;
  name: string;
  aliases: string[];
  diet: Diet;
  /** Role in a meal — used when composing multi-dish plans. */
  role: "main" | "carb" | "side" | "snack" | "drink" | "dessert";
  cuisine: string;
  minutes: number;
  ingredients: RecipeIngredient[];
};

/** A scaled requirement: how much of an ingredient this basket needs. */
export type IngredientRequirement = {
  key: string;
  label: string;
  quantity: number;
  unit: MeasureUnit;
  optional: boolean;
  note?: string;
  /** Which dish(es) asked for it. */
  from: string[];
};

/** An ingredient requirement resolved against the real catalogue. */
export type BasketLine = {
  id: string;
  requirement: IngredientRequirement;
  product: Product | null;
  /** Number of packs of `product` to buy. */
  packs: number;
  /** What those packs actually add up to, in the product's own unit. */
  coverage: string;
  lineTotal: number;
  /** Other catalogue products that satisfy the same requirement. */
  alternatives: Product[];
  /** Set when we had to substitute a different ingredient entirely. */
  substitutedFor?: string;
  unavailableReason?: string;
};

export type BudgetStatus = "no-budget" | "within" | "tight" | "trimmed" | "over";

export type BasketPlan = {
  intent: ShoppingIntent;
  title: string;
  summary: string;
  /** Dishes the planner decided to cook, in order. */
  dishes: { id: string; name: string; servings: number; minutes: number }[];
  lines: BasketLine[];
  subtotal: number;
  savings: number;
  budget: number | null;
  budgetStatus: BudgetStatus;
  /** Plain-language notes: budget trims, substitutions, missing items. */
  notes: string[];
  planner: "llm" | "rules";
};
