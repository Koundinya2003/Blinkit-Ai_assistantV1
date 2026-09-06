import type { Diet, MeasureUnit } from "@/lib/catalog";
import { catalog, displayName } from "@/lib/catalog";
import { coerceIntent, parseIntentWithRules } from "./intent";
import { isLlmConfigured, requestPlan, type LlmDish } from "./llm";
import { buildLine, relineWithProduct } from "./matcher";
import { getOccasion } from "./occasions";
import { collectRequirements, fitToBudget, selectDishes } from "./planner";
import type { BasketLine, BasketPlan, IngredientRequirement, ShoppingIntent } from "./types";

const VALID_UNITS: MeasureUnit[] = ["g", "ml", "piece"];

function normaliseLlmDish(dish: LlmDish, fallbackServings: number) {
  const ingredients: IngredientRequirement[] = [];
  for (const item of dish.ingredients ?? []) {
    const quantity = Number(item?.quantity);
    const unit = VALID_UNITS.includes(item?.unit as MeasureUnit) ? (item.unit as MeasureUnit) : "g";
    if (!item?.key || !Number.isFinite(quantity) || quantity <= 0) continue;
    ingredients.push({
      key: String(item.key).toLowerCase().trim(),
      label: String(item.label ?? item.key).trim(),
      quantity,
      unit,
      optional: Boolean(item.optional),
      note: typeof item.note === "string" && item.note.trim() ? item.note.trim() : undefined,
      from: [dish.name],
    });
  }

  return {
    id: dish.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: dish.name,
    servings: Number.isFinite(dish.servings) && dish.servings > 0 ? Math.round(dish.servings) : fallbackServings,
    minutes: Number.isFinite(dish.minutes) ? Number(dish.minutes) : 30,
    ingredients,
  };
}

/** Folds duplicate ingredient keys across dishes into one requirement. */
function mergeRequirements(groups: IngredientRequirement[][]): IngredientRequirement[] {
  const merged = new Map<string, IngredientRequirement>();
  for (const group of groups) {
    for (const requirement of group) {
      const existing = merged.get(requirement.key);
      if (!existing) {
        merged.set(requirement.key, { ...requirement, from: [...requirement.from] });
        continue;
      }
      existing.quantity =
        requirement.unit === "piece" && requirement.quantity <= 1
          ? Math.max(existing.quantity, requirement.quantity)
          : existing.quantity + requirement.quantity;
      existing.optional = existing.optional && requirement.optional;
      for (const source of requirement.from) {
        if (!existing.from.includes(source)) existing.from.push(source);
      }
    }
  }
  return [...merged.values()];
}

function titleFor(intent: ShoppingIntent, dishNames: string[]): string {
  if (intent.dish) return `${intent.dish} for ${intent.people}`;
  const occasion = intent.occasion ? getOccasion(intent.occasion) : null;
  if (occasion) return `${occasion.name} for ${intent.people}`;
  if (dishNames.length) return `${dishNames[0]} for ${intent.people}`;
  return `A basket for ${intent.people}`;
}

function summaryFor(intent: ShoppingIntent, dishNames: string[], lineCount: number): string {
  const menu =
    dishNames.length > 1
      ? `${dishNames.slice(0, -1).join(", ")} and ${dishNames[dishNames.length - 1]}`
      : dishNames[0] ?? "your basket";
  const budgetClause = intent.budget ? ` within ₹${intent.budget}` : "";
  return `${menu} for ${intent.people} ${intent.people === 1 ? "person" : "people"}${budgetClause} — ${lineCount} item${lineCount === 1 ? "" : "s"} mapped to what's in stock near you.`;
}

export type PlanRequest = {
  query: string;
  /** Product the shopper explicitly chose for a requirement key. */
  overrides?: Record<string, string>;
  /** Requirement keys the shopper removed. */
  removed?: string[];
};

/**
 * The whole flow: sentence → intent → dishes → scaled ingredients → real
 * products → budget-fitted basket. The model only ever plans in ingredient
 * space; every product on the result comes out of the catalogue.
 */
export async function buildBasketPlan(request: PlanRequest): Promise<BasketPlan> {
  const query = request.query.trim();
  const rulesIntent = parseIntentWithRules(query);

  let intent: ShoppingIntent = rulesIntent;
  let planner: BasketPlan["planner"] = "rules";
  let dishes: { id: string; name: string; servings: number; minutes: number }[] = [];
  let requirementGroups: IngredientRequirement[][] = [];
  let title = "";
  let summary = "";

  const llmPlan = isLlmConfigured() ? await requestPlan(query) : null;

  if (llmPlan) {
    const coerced = coerceIntent(query, llmPlan.intent);
    if (coerced) {
      // Rules win on the numbers they can read literally out of the sentence.
      intent = {
        ...coerced,
        people: rulesIntent.people !== 2 ? rulesIntent.people : coerced.people,
        budget: rulesIntent.budget ?? coerced.budget,
        diet: rulesIntent.diet ?? coerced.diet,
      };
    }

    const normalised = llmPlan.dishes.slice(0, 5).map((dish) => normaliseLlmDish(dish, intent.people));
    const usable = normalised.filter((dish) => dish.ingredients.length > 0);

    if (usable.length) {
      planner = "llm";
      dishes = usable.map(({ id, name, servings, minutes }) => ({ id, name, servings, minutes }));
      requirementGroups = usable.map((dish) => dish.ingredients);
      title = llmPlan.title?.trim() || titleFor(intent, dishes.map((d) => d.name));
      summary = llmPlan.summary?.trim() ?? "";
    }
  }

  if (planner === "rules") {
    const selected = selectDishes(intent);
    dishes = selected.map(({ recipe, servings }) => ({
      id: recipe.id,
      name: recipe.name,
      servings,
      minutes: recipe.minutes,
    }));
    requirementGroups = selected.map(({ recipe, servings }) =>
      collectRequirements([{ recipe, servings }])
    );
    title = titleFor(intent, dishes.map((d) => d.name));
  }

  const removed = new Set(request.removed ?? []);
  const requirements = mergeRequirements(requirementGroups).filter((r) => !removed.has(r.key));

  const matchOptions = { diet: intent.diet as Diet | null };

  // Resolve the most specific requirements first ("Paneer" before "Mixed
  // Vegetables"), claiming each product so two lines never buy the same pack.
  const order = [...requirements].sort(
    (a, b) => catalog.byIngredientKey(a.key).length - catalog.byIngredientKey(b.key).length
  );
  const claimed = new Set<string>();
  const claimedKeys = new Set(requirements.map((requirement) => requirement.key));
  const resolved = new Map<string, BasketLine>();

  for (const requirement of order) {
    const overrideId = request.overrides?.[requirement.key];
    const overrideProduct = overrideId ? catalog.byId(overrideId) : undefined;

    let line = buildLine(
      requirement,
      { ...matchOptions, exclude: claimed, claimedKeys },
      overrideId
    );
    if (overrideProduct && line.product?.id !== overrideProduct.id) {
      line = relineWithProduct(line, overrideProduct);
    }
    if (line.product) claimed.add(line.product.id);
    resolved.set(requirement.key, line);
  }

  const lines: BasketLine[] = requirements
    .map((requirement) => resolved.get(requirement.key))
    .filter((line): line is BasketLine => Boolean(line));

  const fitted = fitToBudget(lines, intent.budget, matchOptions.diet);

  const notes = [...fitted.notes];
  for (const line of fitted.lines) {
    if (line.unavailableReason) notes.push(line.unavailableReason);
    else if (line.substitutedFor && line.product) {
      notes.push(`No ${line.substitutedFor.toLowerCase()} in stock — using ${displayName(line.product)} instead.`);
    }
  }

  const subtotal = fitted.lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const savings = fitted.lines.reduce(
    (sum, line) => sum + (line.product ? (line.product.mrp - line.product.price) * line.packs : 0),
    0
  );

  return {
    intent,
    title,
    summary: summary || summaryFor(intent, dishes.map((d) => d.name), fitted.lines.length),
    dishes,
    lines: fitted.lines,
    subtotal,
    savings,
    budget: intent.budget,
    budgetStatus: fitted.status,
    notes: [...new Set(notes)].slice(0, 5),
    planner,
  };
}
