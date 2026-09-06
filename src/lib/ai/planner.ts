import { displayName } from "@/lib/catalog";
import type { Diet } from "@/lib/catalog";
import { buildLine, rankCandidates } from "./matcher";
import { OCCASIONS, getOccasion } from "./occasions";
import { findRecipeByName, getRecipe } from "./recipes";
import type {
  BasketLine,
  BudgetStatus,
  IngredientRequirement,
  Recipe,
  RecipeIngredient,
  ShoppingIntent,
} from "./types";

/** Scales one recipe line to a head count. */
function scaleIngredient(ingredient: RecipeIngredient, servings: number): number {
  const scaling = ingredient.scaling ?? "linear";
  if (scaling === "fixed") return ingredient.per;
  if (scaling === "sublinear") return ingredient.per * Math.pow(servings, 0.65);
  return ingredient.per * servings;
}

function roundQuantity(value: number, unit: RecipeIngredient["unit"]): number {
  if (unit === "piece") return Math.max(0.5, Math.round(value * 2) / 2);
  if (value >= 100) return Math.round(value / 25) * 25;
  return Math.max(5, Math.round(value / 5) * 5);
}

/** Merges the ingredient lines of every chosen dish into one shopping list. */
export function collectRequirements(
  dishes: { recipe: Recipe; servings: number }[]
): IngredientRequirement[] {
  const merged = new Map<string, IngredientRequirement>();

  for (const { recipe, servings } of dishes) {
    for (const ingredient of recipe.ingredients) {
      const quantity = scaleIngredient(ingredient, servings);
      const existing = merged.get(ingredient.key);

      if (existing) {
        // Fixed items (a jar of masala) never double up across dishes.
        const isFixed = (ingredient.scaling ?? "linear") === "fixed";
        existing.quantity = isFixed
          ? Math.max(existing.quantity, quantity)
          : existing.quantity + quantity;
        existing.optional = existing.optional && Boolean(ingredient.optional);
        if (!existing.from.includes(recipe.name)) existing.from.push(recipe.name);
        continue;
      }

      merged.set(ingredient.key, {
        key: ingredient.key,
        label: ingredient.label,
        quantity,
        unit: ingredient.unit,
        optional: Boolean(ingredient.optional),
        note: ingredient.note,
        from: [recipe.name],
      });
    }
  }

  for (const requirement of merged.values()) {
    requirement.quantity = roundQuantity(requirement.quantity, requirement.unit);
  }

  return [...merged.values()];
}

/** Rough per-head cost of cooking a dish, used to compose within budget. */
function estimateRecipeCost(recipe: Recipe, servings: number, diet: Diet | null): number {
  const requirements = collectRequirements([{ recipe, servings }]);
  let total = 0;
  for (const requirement of requirements) {
    if (requirement.optional) continue;
    const [best] = rankCandidates(requirement, { diet });
    total += best ? best.cost : 0;
  }
  return total;
}

function dietFits(recipe: Recipe, diet: Diet | null): boolean {
  if (!diet) return true;
  if (diet === "nonveg") return true;
  if (diet === "egg") return recipe.diet !== "nonveg";
  return recipe.diet === "veg";
}

/**
 * Picks the dishes for an occasion. This is the planning step that makes
 * "dinner for 4 under ₹600" a different meal from "dinner for 4 under ₹2000":
 * every course is priced against the real catalogue first, then the planner
 * spends what it has on the most substantial menu that still fits.
 */
export function composeOccasion(
  occasionId: string,
  intent: ShoppingIntent
): { recipe: Recipe; servings: number }[] {
  const template = getOccasion(occasionId) ?? OCCASIONS[0];
  const servings = intent.people;
  const quick = intent.notes.includes("Quick to cook");
  const target = intent.budget ?? template.comfortablePerHead * servings;

  // Price every candidate against the catalogue before choosing anything.
  const courses = template.courses
    .map((course) => {
      const priced = course.options
        .map((id) => getRecipe(id))
        .filter((recipe): recipe is Recipe => Boolean(recipe) && dietFits(recipe as Recipe, intent.diet))
        .map((recipe) => ({ recipe, cost: estimateRecipeCost(recipe, servings, intent.diet) }))
        .sort((a, b) => a.cost - b.cost);
      return { course, priced };
    })
    .filter((entry) => entry.priced.length > 0);

  const required = courses.filter((entry) => !entry.course.optional);
  const chosen: { recipe: Recipe; servings: number }[] = [];
  let spent = 0;

  const pick = (
    priced: { recipe: Recipe; cost: number }[],
    allowance: number,
    role: string
  ) => {
    const affordable = priced.filter((entry) => entry.cost <= allowance);
    const pool = affordable.length ? affordable : [priced[0]];

    // A stated diet preference should decide the main, not the price.
    if (intent.diet === "nonveg" && role === "main") {
      const nonVeg = pool.find((entry) => entry.recipe.diet === "nonveg");
      if (nonVeg) return nonVeg;
    }
    if (quick) {
      return [...pool].sort((a, b) => a.recipe.minutes - b.recipe.minutes)[0];
    }
    // Spend up to the allowance: the best meal the budget can carry.
    return pool[pool.length - 1];
  };

  for (let index = 0; index < required.length; index += 1) {
    const entry = required[index];
    // Reserve the cheapest possible cost of every required course still to come.
    const reserved = required
      .slice(index + 1)
      .reduce((sum, next) => sum + next.priced[0].cost, 0);
    const selection = pick(entry.priced, Math.max(0, target - spent - reserved), entry.course.role);
    chosen.push({ recipe: selection.recipe, servings });
    spent += selection.cost;
  }

  // Extras go in only if there is genuinely room for them.
  for (const entry of courses.filter((item) => item.course.optional)) {
    const cheapest = entry.priced[0];
    if (spent + cheapest.cost > target * 0.95) continue;
    const selection = pick(entry.priced, target - spent, entry.course.role);
    chosen.push({ recipe: selection.recipe, servings });
    spent += selection.cost;
  }

  // Keep the menu in the template's course order rather than required-then-optional.
  const order = new Map(template.courses.map((course, index) => [course.role, index]));
  return chosen.sort(
    (a, b) => (order.get(a.recipe.role) ?? 99) - (order.get(b.recipe.role) ?? 99)
  );
}

/** Resolves an intent into the dishes that will be cooked. */
export function selectDishes(intent: ShoppingIntent): { recipe: Recipe; servings: number }[] {
  if (intent.dish) {
    const recipe = findRecipeByName(intent.dish);
    if (recipe) {
      const dishes = [{ recipe, servings: intent.people }];
      // A biryani stands alone; a curry wants rice or roti alongside it.
      if (recipe.role === "main" && !/biryani|pulao|rice|khichdi|pasta|noodle|sandwich|dosa|idli|poha|upma|paratha/i.test(recipe.name)) {
        const carb = getRecipe(intent.diet === "veg" || !intent.diet ? "roti" : "jeera-rice");
        if (carb) dishes.push({ recipe: carb, servings: intent.people });
      }
      return dishes;
    }
  }

  if (intent.occasion) return composeOccasion(intent.occasion, intent);

  if (intent.kind === "restock") return composeOccasion("dinner", intent);

  // Nothing recognised — fall back to a sensible dinner.
  return composeOccasion("dinner", intent);
}

const BUDGET_TIGHT_RATIO = 0.92;

/**
 * Fits the basket to a budget: first swap in cheaper packs, then drop the
 * ingredients marked optional. Never silently deletes anything essential.
 */
export function fitToBudget(
  lines: BasketLine[],
  budget: number | null,
  diet: Diet | null
): { lines: BasketLine[]; status: BudgetStatus; notes: string[] } {
  const total = (items: BasketLine[]) => items.reduce((sum, line) => sum + line.lineTotal, 0);

  if (!budget) return { lines, status: "no-budget", notes: [] };
  if (total(lines) <= budget) {
    return {
      lines,
      status: total(lines) >= budget * BUDGET_TIGHT_RATIO ? "tight" : "within",
      notes: [],
    };
  }

  // Pass 1 — cheapest viable pack for every line. Swap notes are held per line
  // so a swap on something we later drop is never reported.
  const swapNotes = new Map<string, string>();
  let working = lines.map((line) => {
    if (!line.product) return line;
    const swapped = buildLine(line.requirement, { diet, cheapest: true });
    if (swapped.product && swapped.lineTotal < line.lineTotal) {
      swapNotes.set(
        line.id,
        `Swapped ${displayName(line.product)} for ${displayName(swapped.product)} to protect the budget.`
      );
      return swapped;
    }
    return line;
  });

  const notesFor = (items: BasketLine[], extra: string[] = []) => [
    ...extra,
    ...items.map((line) => swapNotes.get(line.id)).filter((note): note is string => Boolean(note)),
  ];

  if (total(working) <= budget) {
    return { lines: working, status: "trimmed", notes: notesFor(working).slice(0, 4) };
  }

  // Pass 2 — drop the nice-to-haves, most expensive first.
  const dropNotes: string[] = [];
  const optionalLines = working
    .filter((line) => line.requirement.optional && line.product)
    .sort((a, b) => b.lineTotal - a.lineTotal);

  const dropped = new Set<string>();
  for (const line of optionalLines) {
    if (total(working.filter((item) => !dropped.has(item.id))) <= budget) break;
    dropped.add(line.id);
    dropNotes.push(
      `Left out ${line.requirement.label.toLowerCase()} — optional, and it was pushing you over budget.`
    );
  }
  working = working.filter((line) => !dropped.has(line.id));

  if (total(working) <= budget) {
    return { lines: working, status: "trimmed", notes: notesFor(working, dropNotes).slice(0, 4) };
  }

  const shortfall = Math.round(total(working) - budget);
  return {
    lines: working,
    status: "over",
    notes: notesFor(working, [
      `The essentials for this come to about \u20B9${shortfall} more than \u20B9${budget}. This is the closest basket that still cooks properly — drop an item or raise the budget a little.`,
      ...dropNotes,
    ]).slice(0, 4),
  };
}

