export type TaxonomyEntry = {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
};

/** Top-level aisles, ordered the way they appear on the category rail. */
export const TAXONOMY: TaxonomyEntry[] = [
  { id: "vegetables-fruits", name: "Vegetables & Fruits", emoji: "🥬", tagline: "Farm fresh, picked today" },
  { id: "dairy-bread-eggs", name: "Dairy, Bread & Eggs", emoji: "🥛", tagline: "Milk, curd, paneer & bakes" },
  { id: "meat-fish", name: "Chicken, Meat & Fish", emoji: "🍗", tagline: "Fresh cuts, cleaned & packed" },
  { id: "atta-rice-dal", name: "Atta, Rice & Dal", emoji: "🌾", tagline: "Kitchen staples in bulk" },
  { id: "masala-oil", name: "Masala, Oil & More", emoji: "🧂", tagline: "Spices, oils & dry fruits" },
  { id: "sauces-spreads", name: "Sauces & Spreads", emoji: "🍯", tagline: "Dips, jams & condiments" },
  { id: "snacks-munchies", name: "Snacks & Munchies", emoji: "🍿", tagline: "Chips, namkeen & nuts" },
  { id: "bakery-biscuits", name: "Bakery & Biscuits", emoji: "🍪", tagline: "Tea-time favourites" },
  { id: "sweet-tooth", name: "Sweet Tooth", emoji: "🍫", tagline: "Chocolates & ice creams" },
  { id: "cold-drinks-juices", name: "Cold Drinks & Juices", emoji: "🥤", tagline: "Chilled and ready to pour" },
  { id: "tea-coffee-health", name: "Tea, Coffee & Health", emoji: "☕", tagline: "Brews and health drinks" },
  { id: "breakfast-instant", name: "Breakfast & Instant", emoji: "🍜", tagline: "Cereals, noodles & frozen" },
  { id: "cleaning-essentials", name: "Cleaning Essentials", emoji: "🧽", tagline: "Keep the home spotless" },
  { id: "personal-care", name: "Personal Care", emoji: "🧼", tagline: "Daily care and grooming" },
  { id: "baby-care", name: "Baby Care", emoji: "🍼", tagline: "Everything for the little one" },
];

const BY_ID = new Map(TAXONOMY.map((entry) => [entry.id, entry]));

export function getCategoryEntry(id: string): TaxonomyEntry | undefined {
  return BY_ID.get(id);
}

export function categoryName(id: string): string {
  return BY_ID.get(id)?.name ?? id;
}
