/** Base measurement units every pack size normalises to. */
export type MeasureUnit = "g" | "ml" | "piece";

export type Diet = "veg" | "egg" | "nonveg";

/**
 * Compact catalogue record. This is the shape a real Blinkit feed would be
 * mapped into — one row per sellable pack.
 */
export type RawProduct = {
  id: string;
  name: string;
  brand: string;
  /** Category id from the taxonomy. */
  cat: string;
  /** Sub-category display name within the category. */
  sub: string;
  /** Human pack label as printed on the pack: "500 g", "1 L", "6 pcs". */
  pack: string;
  price: number;
  mrp: number;
  rating: number;
  ratings: number;
  diet: Diet;
  /** Canonical ingredient keys this pack can satisfy. */
  keys: string[];
  tags: string[];
};

/** Normalised product used everywhere in the app. */
export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categoryId: string;
  categoryName: string;
  subcategory: string;
  /** Pack label as shown to shoppers. */
  pack: string;
  /** Pack size expressed in `packUnit`. */
  packSize: number;
  packUnit: MeasureUnit;
  price: number;
  mrp: number;
  discountPercent: number;
  /** Price per base unit — used to compare packs of different sizes. */
  unitPrice: number;
  rating: number;
  ratings: number;
  inStock: boolean;
  stock: number;
  etaMinutes: number;
  diet: Diet;
  ingredientKeys: string[];
  tags: string[];
  description: string;
  image: string;
};

export type CategoryNode = {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  subcategories: string[];
  productCount: number;
};
