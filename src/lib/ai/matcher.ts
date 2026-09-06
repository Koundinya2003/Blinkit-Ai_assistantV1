import { catalog, convertAmount, dietAllows, formatAmount } from "@/lib/catalog";
import type { Diet, Product } from "@/lib/catalog";
import { SUBSTITUTES } from "./recipes";
import type { BasketLine, IngredientRequirement } from "./types";

const MAX_PACKS = 8;

export type MatchOptions = {
  diet: Diet | null;
  /** Prefer the cheapest viable pack over the best-rated one. */
  cheapest?: boolean;
  /** Products already claimed by another line of the same basket. */
  exclude?: Set<string>;
  /** Ingredient keys other lines of this basket are buying in their own right. */
  claimedKeys?: Set<string>;
};

/**
 * Keys that stand for a group rather than a specific item. "Mixed vegetables"
 * should not be filled with onions when the basket already buys onions by name.
 */
const GENERIC_KEYS = new Set([
  "vegetable",
  "fruit",
  "greens",
  "herbs",
  "dal",
  "flour",
  "rice",
  "masala",
  "whole-spices",
  "dry-fruits",
  "protein",
  "party-snack",
  "spread",
  "sauce",
  "dip",
  "frozen-snack",
  "breakfast",
  "dessert",
]);

type Candidate = {
  product: Product;
  packs: number;
  score: number;
  cost: number;
};

/**
 * How many packs cover the requirement, and how well the pack size fits.
 * A 500 g pack for a 400 g need is a good fit; a 5 kg sack is not.
 */
function fitPacks(requirement: IngredientRequirement, product: Product): { packs: number; waste: number } | null {
  const needed = convertAmount(requirement.quantity, requirement.unit, product.packUnit, requirement.key);
  if (needed === null) {
    // No conversion between the recipe's unit and the pack's (e.g. 550 g of
    // "frozen starters" against a 2-piece pack). One pack covers it, but a
    // product measured in the same unit as the recipe should still win.
    return { packs: 1, waste: 1.6 };
  }
  if (needed <= 0) return { packs: 1, waste: 0 };

  const packs = Math.min(MAX_PACKS, Math.max(1, Math.ceil(needed / Math.max(product.packSize, 0.0001))));
  const supplied = packs * product.packSize;
  const waste = (supplied - needed) / Math.max(needed, 0.0001);
  return { packs, waste };
}

/** How much of the requirement label the product name actually says back. */
function labelAffinity(label: string, product: Product): number {
  const words = label.toLowerCase().split(/[^a-z]+/).filter((word) => word.length > 2);
  if (!words.length) return 0;
  const name = product.name.toLowerCase();
  const hits = words.filter((word) => name.includes(word)).length;
  return (hits / words.length) * 5;
}

// An exact ingredient-key match must always beat a lexical guess, whatever the
// price or pack size — this is what stops "toor dal" resolving to sandalwood soap.
const KEY_RANK_BONUS = [40, 10, 4];

function scoreCandidate(
  requirement: IngredientRequirement,
  product: Product,
  keyRank: number,
  options: MatchOptions
): Candidate | null {
  if (!product.inStock) return null;
  if (!dietAllows(product.diet, options.diet)) return null;

  const fit = fitPacks(requirement, product);
  if (!fit) return null;

  const cost = fit.packs * product.price;

  let score = KEY_RANK_BONUS[Math.min(keyRank, KEY_RANK_BONUS.length - 1)];
  score += labelAffinity(requirement.label, product);
  // A product that names the ingredient is nearly always the right pick.
  // Penalise buying far more than the recipe needs.
  score -= Math.min(6, fit.waste * 2.5);
  // Penalise multi-pack workarounds.
  score -= (fit.packs - 1) * 0.8;
  // Nudge towards products people actually buy.
  score += product.rating - 3.6;
  score += Math.min(1.2, Math.log10(Math.max(product.ratings, 10)) / 4);
  // Value for money, scaled so it never dominates fit.
  score += options.cheapest ? Math.max(-5, 4 - cost / 50) : Math.max(-2, 1.5 - cost / 200);

  return { product, packs: fit.packs, score, cost };
}

/** Every catalogue product that could stand in for this requirement, ranked. */
export function rankCandidates(
  requirement: IngredientRequirement,
  options: MatchOptions
): Candidate[] {
  return rankWithProvenance(requirement, options).candidates;
}

/**
 * Ranks catalogue products for a requirement, and reports whether anything
 * carried the ingredient key outright — the caller needs that to know when it
 * is genuinely substituting rather than just preferring a different pack.
 */
export function rankWithProvenance(
  requirement: IngredientRequirement,
  options: MatchOptions
): { candidates: Candidate[]; hadExactMatch: boolean } {
  const seen = new Map<string, { product: Product; keyRank: number }>();

  const consider = (product: Product, keyRank: number) => {
    const existing = seen.get(product.id);
    if (!existing || keyRank < existing.keyRank) seen.set(product.id, { product, keyRank });
  };

  // 1. Exact ingredient key.
  const exact = catalog.byIngredientKey(requirement.key);
  for (const product of exact) consider(product, 0);

  // 2. Text match on the human label, only when the key itself came up short.
  if (exact.length === 0) {
    for (const product of catalog.search(requirement.label, 8)) consider(product, 1);
  }

  // 3. Declared substitutes.
  if (seen.size === 0) {
    for (const substituteKey of SUBSTITUTES[requirement.key] ?? []) {
      for (const product of catalog.byIngredientKey(substituteKey)) consider(product, 2);
    }
  }

  const ranked: Candidate[] = [];
  for (const { product, keyRank } of seen.values()) {
    const candidate = scoreCandidate(requirement, product, keyRank, options);
    if (candidate) ranked.push(candidate);
  }

  ranked.sort((a, b) => b.score - a.score);

  // Don't buy onions twice because both "Onion" and "Mixed Vegetables" match
  // them — by pack, and by what the rest of the basket already covers.
  let filtered = ranked;
  if (options.exclude?.size) {
    const fresh = filtered.filter((candidate) => !options.exclude!.has(candidate.product.id));
    if (fresh.length) filtered = fresh;
  }
  if (GENERIC_KEYS.has(requirement.key) && options.claimedKeys?.size) {
    const distinct = filtered.filter((candidate) =>
      !candidate.product.ingredientKeys.some(
        (key) => key !== requirement.key && options.claimedKeys!.has(key)
      )
    );
    if (distinct.length) filtered = distinct;
  }

  return { candidates: filtered, hadExactMatch: exact.length > 0 };
}

export function buildLine(
  requirement: IngredientRequirement,
  options: MatchOptions,
  preferredProductId?: string
): BasketLine {
  const { candidates: ranked, hadExactMatch } = rankWithProvenance(requirement, options);

  if (!ranked.length) {
    return {
      id: requirement.key,
      requirement,
      product: null,
      packs: 0,
      coverage: "",
      lineTotal: 0,
      alternatives: [],
      unavailableReason: `Nothing in the store matches ${requirement.label.toLowerCase()} right now.`,
    };
  }

  const chosen = (preferredProductId && ranked.find((c) => c.product.id === preferredProductId)) || ranked[0];
  const substituted = !hadExactMatch && !chosen.product.ingredientKeys.includes(requirement.key);

  return {
    id: requirement.key,
    requirement,
    product: chosen.product,
    packs: chosen.packs,
    coverage: formatAmount(chosen.packs * chosen.product.packSize, chosen.product.packUnit),
    lineTotal: chosen.packs * chosen.product.price,
    alternatives: ranked
      .filter((candidate) => candidate.product.id !== chosen.product.id)
      .slice(0, 6)
      .map((candidate) => candidate.product),
    substitutedFor: substituted ? requirement.label : undefined,
  };
}

/** Re-prices a line against a different product the shopper picked. */
export function relineWithProduct(line: BasketLine, product: Product): BasketLine {
  const fit = fitPacks(line.requirement, product) ?? { packs: 1, waste: 0 };
  return {
    ...line,
    product,
    packs: fit.packs,
    coverage: formatAmount(fit.packs * product.packSize, product.packUnit),
    lineTotal: fit.packs * product.price,
  };
}
