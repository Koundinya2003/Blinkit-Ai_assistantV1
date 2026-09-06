import { RAW_PRODUCTS } from "./products";
import { TAXONOMY, categoryName } from "./taxonomy";
import { parsePack } from "./units";
import type { CategoryNode, Diet, Product, RawProduct } from "./types";

export * from "./types";
export * from "./units";
export { TAXONOMY, getCategoryEntry, categoryName } from "./taxonomy";

/**
 * Everything the app knows how to ask a catalogue for. The in-memory
 * implementation below is the only one today; a live Blinkit feed would
 * implement the same surface and nothing upstream would change.
 */
export interface CatalogSource {
  all(): Product[];
  byId(id: string): Product | undefined;
  bySlug(slug: string): Product | undefined;
  byCategory(categoryId: string): Product[];
  search(query: string, limit?: number): Product[];
  /** Products that can satisfy a canonical ingredient key. */
  byIngredientKey(key: string): Product[];
  categories(): CategoryNode[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Deterministic pseudo-random so stock/ETA stay stable between renders. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function describe(raw: RawProduct): string {
  const noun = raw.sub.toLowerCase();
  return `${raw.brand} ${raw.name} — ${raw.pack} pack of ${noun}, delivered to your door in minutes.`;
}

function normalise(raw: RawProduct): Product {
  const { size, unit } = parsePack(raw.pack);
  const seed = hash(raw.id);
  const stock = seed % 100 === 0 ? 0 : 4 + (seed % 60);
  const discountPercent = raw.mrp > raw.price ? Math.round(((raw.mrp - raw.price) / raw.mrp) * 100) : 0;

  return {
    id: raw.id,
    slug: slugify(raw.id),
    name: raw.name,
    brand: raw.brand,
    categoryId: raw.cat,
    categoryName: categoryName(raw.cat),
    subcategory: raw.sub,
    pack: raw.pack,
    packSize: size,
    packUnit: unit,
    price: raw.price,
    mrp: raw.mrp,
    discountPercent,
    unitPrice: raw.price / Math.max(size, 1),
    rating: raw.rating,
    ratings: raw.ratings,
    inStock: stock > 0,
    stock,
    etaMinutes: 8 + (seed % 8),
    diet: raw.diet,
    ingredientKeys: raw.keys,
    tags: raw.tags,
    description: describe(raw),
    image: "",
  };
}

class InMemoryCatalog implements CatalogSource {
  private readonly products: Product[];
  private readonly idIndex: Map<string, Product>;
  private readonly slugIndex: Map<string, Product>;
  private readonly categoryIndex: Map<string, Product[]>;
  private readonly keyIndex: Map<string, Product[]>;

  constructor(raws: RawProduct[]) {
    this.products = raws.map(normalise);
    this.idIndex = new Map(this.products.map((p) => [p.id, p]));
    this.slugIndex = new Map(this.products.map((p) => [p.slug, p]));
    this.categoryIndex = new Map();
    this.keyIndex = new Map();

    for (const product of this.products) {
      const bucket = this.categoryIndex.get(product.categoryId);
      if (bucket) bucket.push(product);
      else this.categoryIndex.set(product.categoryId, [product]);

      for (const key of product.ingredientKeys) {
        const keyBucket = this.keyIndex.get(key);
        if (keyBucket) keyBucket.push(product);
        else this.keyIndex.set(key, [product]);
      }
    }
  }

  all() {
    return this.products;
  }

  byId(id: string) {
    return this.idIndex.get(id);
  }

  bySlug(slug: string) {
    return this.slugIndex.get(slug);
  }

  byCategory(categoryId: string) {
    return this.categoryIndex.get(categoryId) ?? [];
  }

  byIngredientKey(key: string) {
    return this.keyIndex.get(key) ?? [];
  }

  search(query: string, limit = 60) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];

    const scored: { product: Product; score: number }[] = [];
    for (const product of this.products) {
      const haystack = `${product.name} ${product.brand} ${product.subcategory} ${product.categoryName} ${product.tags.join(" ")} ${product.ingredientKeys.join(" ")}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        // Whole-word matching: "dal" must not match "Sandalwood".
        const word = new RegExp(`\\b${escapeRegExp(term)}`);
        if (!word.test(haystack)) {
          score = -1;
          break;
        }
        const name = product.name.toLowerCase();
        if (name.startsWith(term)) score += 4;
        else if (new RegExp(`\\b${escapeRegExp(term)}`).test(name)) score += 3;
        else if (product.brand.toLowerCase().includes(term)) score += 2;
        else score += 1;
      }
      if (score < 0) continue;
      scored.push({ product, score: score + product.rating / 5 + (product.inStock ? 0.5 : 0) });
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.product);
  }

  categories(): CategoryNode[] {
    return TAXONOMY.map((entry) => {
      const items = this.byCategory(entry.id);
      const subcategories = [...new Set(items.map((item) => item.subcategory))].sort();
      return { ...entry, subcategories, productCount: items.length };
    }).filter((entry) => entry.productCount > 0);
  }
}

export const catalog: CatalogSource = new InMemoryCatalog(RAW_PRODUCTS);

/** Every ingredient key the catalogue can currently satisfy. */
export const INGREDIENT_KEYS: string[] = [
  ...new Set(RAW_PRODUCTS.flatMap((product) => product.keys)),
].sort();

/**
 * "Amul" + "Paneer" reads well; "Coca-Cola" + "Coca-Cola" does not. Some
 * catalogue names already carry the brand, so only prefix it when it is absent.
 */
export function displayName(product: Pick<Product, "brand" | "name">): string {
  const name = product.name.toLowerCase();
  const brand = product.brand.toLowerCase();
  return name.startsWith(brand) || name.includes(brand) ? product.name : `${product.brand} ${product.name}`;
}

export function dietAllows(productDiet: Diet, preference: Diet | null): boolean {
  if (!preference) return true;
  if (preference === "nonveg") return true;
  if (preference === "egg") return productDiet !== "nonveg";
  return productDiet === "veg";
}
