import type { Product, Category } from "./types";
import { getProductsWithFallback } from "./data-service";

export interface SearchFilters {
  query?: string;
  categories?: Category[];
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  tags?: string[];
  dietary?: string[];
  inStock?: boolean;
  sortBy?: "price_asc" | "price_desc" | "rating" | "popularity" | "delivery";
}

export interface ParsedSearchIntent {
  originalQuery: string;
  filters: SearchFilters;
  explanation: string;
  confidence: number;
}

/**
 * Natural language search interpreter
 * Converts natural language queries into structured filters
 */
export function parseSearchQuery(query: string): ParsedSearchIntent {
  const lowerQuery = query.toLowerCase().trim();
  const filters: SearchFilters = {};
  const explanations: string[] = [];
  let confidence = 0.5;

  // Price range detection
  const priceUnderMatch = lowerQuery.match(/under\s+(?:₹|rs\.?|rupees?)\s*(\d+)/);
  const priceAboveMatch = lowerQuery.match(/above\s+(?:₹|rs\.?|rupees?)\s*(\d+)/);
  const priceBetweenMatch = lowerQuery.match(/between\s+(?:₹|rs\.?|rupees?)\s*(\d+)\s+(?:and|to|-)\s*(?:₹|rs\.?|rupees?)\s*(\d+)/);
  
  if (priceUnderMatch) {
    filters.maxPrice = parseInt(priceUnderMatch[1]);
    explanations.push(`under ₹${filters.maxPrice}`);
    confidence += 0.2;
  } else if (priceAboveMatch) {
    filters.minPrice = parseInt(priceAboveMatch[1]);
    explanations.push(`above ₹${filters.minPrice}`);
    confidence += 0.2;
  } else if (priceBetweenMatch) {
    filters.minPrice = parseInt(priceBetweenMatch[1]);
    filters.maxPrice = parseInt(priceBetweenMatch[2]);
    explanations.push(`between ₹${filters.minPrice} and ₹${filters.maxPrice}`);
    confidence += 0.2;
  }

  // Rating detection
  const ratingMatch = lowerQuery.match(/(?:best|top|highly\s+rated|rated)\s+(\d+\.?\d*)\+?/);
  if (ratingMatch) {
    filters.minRating = parseFloat(ratingMatch[1]);
    explanations.push(`rated ${filters.minRating}★ or above`);
    confidence += 0.15;
  }

  // Category detection
  const categoryKeywords: Record<string, Category> = {
    "breakfast": "Dairy & Breakfast",
    "milk": "Dairy & Breakfast",
    "cereal": "Dairy & Breakfast",
    "snacks": "Snacks",
    "snack": "Snacks",
    "chips": "Snacks",
    "beverages": "Beverages",
    "coffee": "Beverages",
    "tea": "Beverages",
    "juice": "Beverages",
    "bakery": "Bakery",
    "cake": "Bakery",
    "household": "Household",
    "cleaning": "Household",
    "detergent": "Household",
    "personal care": "Personal Care",
    "beauty": "Personal Care",
    "baby care": "Baby Care",
    "baby": "Baby Care",
    "diapers": "Baby Care",
    "instant food": "Instant Food",
    "noodles": "Instant Food",
    "pasta": "Instant Food",
    "staples": "Staples",
    "rice": "Staples",
    "dal": "Staples",
    "oil": "Staples",
    "flour": "Staples",
    "fruits": "Fruits & Vegetables",
    "vegetables": "Fruits & Vegetables",
    "fruit": "Fruits & Vegetables",
    "vegetable": "Fruits & Vegetables"
  };

  const detectedCategories: Category[] = [];
  for (const [keyword, category] of Object.entries(categoryKeywords)) {
    if (lowerQuery.includes(keyword) && !detectedCategories.includes(category)) {
      detectedCategories.push(category);
    }
  }

  if (detectedCategories.length > 0) {
    filters.categories = detectedCategories;
    explanations.push(`in ${detectedCategories.join(" and ").toLowerCase()}`);
    confidence += 0.2;
  }

  // Dietary preferences
  const dietaryKeywords: Record<string, string[]> = {
    "healthy": ["healthy", "low fat", "diet"],
    "high protein": ["protein", "whey", "greek yogurt"],
    "vegan": ["vegan", "plant-based"],
    "gluten free": ["gluten-free", "gluten free"],
    "organic": ["organic"]
  };

  const detectedDietary: string[] = [];
  for (const [diet, keywords] of Object.entries(dietaryKeywords)) {
    if (keywords.some(keyword => lowerQuery.includes(keyword))) {
      detectedDietary.push(diet);
    }
  }

  if (detectedDietary.length > 0) {
    filters.dietary = detectedDietary;
    explanations.push(detectedDietary.join(", "));
    confidence += 0.15;
  }

  // Use case detection
  const useCaseKeywords: Record<string, string[]> = {
    "office": ["office", "work", "travel"],
    "party": ["party", "celebration", "gathering"],
    "kids": ["kids", "children", "baby"],
    "fitness": ["fitness", "gym", "workout", "protein"],
    "breakfast": ["breakfast", "morning"],
    "lunch": ["lunch", "meal"],
    "dinner": ["dinner", "evening"],
    "snacks": ["snacks", "evening", "munching"]
  };

  const detectedUseCases: string[] = [];
  for (const [useCase, keywords] of Object.entries(useCaseKeywords)) {
    if (keywords.some(keyword => lowerQuery.includes(keyword))) {
      detectedUseCases.push(useCase);
    }
  }

  // Brand detection
  const knownBrands = [
    "Amul", "Britannia", "Kellogg's", "Nescafe", "Unibic", "MuscleBlaze",
    "Epigamia", "Fresho", "Saffola", "Pampers", "Himalaya", "Johnson's",
    "Surf Excel", "Tata", "Maggi"
  ];

  const detectedBrands = knownBrands.filter(brand => 
    lowerQuery.includes(brand.toLowerCase())
  );

  if (detectedBrands.length > 0) {
    filters.brands = detectedBrands;
    explanations.push(`from ${detectedBrands.join(" and ")}`);
    confidence += 0.15;
  }

  // Product type detection
  const productTypes: Record<string, string[]> = {
    "milk": ["milk", "dairy"],
    "bread": ["bread", "toast"],
    "eggs": ["eggs"],
    "butter": ["butter"],
    "cheese": ["cheese"],
    "yogurt": ["yogurt", "curd"],
    "coffee": ["coffee"],
    "tea": ["tea"],
    "juice": ["juice"],
    "water": ["water"],
    "snacks": ["snacks", "chips", "cookies"],
    "noodles": ["noodles"],
    "pasta": ["pasta"],
    "rice": ["rice"],
    "dal": ["dal", "lentils"],
    "oil": ["oil"],
    "salt": ["salt"],
    "sugar": ["sugar"],
    "detergent": ["detergent", "soap"],
    "shampoo": ["shampoo"],
    "diapers": ["diapers"],
    "baby food": ["baby food", "formula"]
  };

  const detectedProducts: string[] = [];
  for (const [product, keywords] of Object.entries(productTypes)) {
    if (keywords.some(keyword => lowerQuery.includes(keyword))) {
      detectedProducts.push(product);
    }
  }

  if (detectedProducts.length > 0) {
    filters.tags = detectedProducts;
    explanations.push(detectedProducts.join(", "));
    confidence += 0.2;
  }

  // Special queries
  if (lowerQuery.includes("family pack") || lowerQuery.includes("bulk")) {
    filters.tags = [...(filters.tags || []), "family", "bulk"];
    explanations.push("family pack");
    confidence += 0.1;
  }

  if (lowerQuery.includes("best") || lowerQuery.includes("top")) {
    filters.sortBy = "rating";
    explanations.push("best rated");
    confidence += 0.1;
  }

  if (lowerQuery.includes("cheap") || lowerQuery.includes("budget") || lowerQuery.includes("value")) {
    filters.sortBy = "price_asc";
    explanations.push("best value");
    confidence += 0.1;
  }

  // Build explanation
  const explanation = explanations.length > 0
    ? `Searching for ${explanations.join(", ")}`
    : `Searching for "${query}"`;

  return {
    originalQuery: query,
    filters,
    explanation,
    confidence: Math.min(confidence, 0.95)
  };
}

/**
 * Execute a natural language search
 */
export async function smartSearch(query: string): Promise<{
  products: Product[];
  intent: ParsedSearchIntent;
}> {
  const intent = parseSearchQuery(query);
  let products = await getProductsWithFallback();

  // Apply category filter
  if (intent.filters.categories && intent.filters.categories.length > 0) {
    products = products.filter(p => intent.filters.categories!.includes(p.category));
  }

  // Apply brand filter
  if (intent.filters.brands && intent.filters.brands.length > 0) {
    products = products.filter(p => intent.filters.brands!.includes(p.brand));
  }

  // Apply price filter
  if (intent.filters.minPrice !== undefined) {
    products = products.filter(p => p.price >= intent.filters.minPrice!);
  }
  if (intent.filters.maxPrice !== undefined) {
    products = products.filter(p => p.price <= intent.filters.maxPrice!);
  }

  // Apply rating filter
  if (intent.filters.minRating !== undefined) {
    products = products.filter(p => p.rating >= intent.filters.minRating!);
  }

  // Apply tag filter
  if (intent.filters.tags && intent.filters.tags.length > 0) {
    products = products.filter(p => 
      intent.filters.tags!.some(tag => 
        p.tags.some(t => t.toLowerCase().includes(tag.toLowerCase())) ||
        p.aiSignals.some(s => s.toLowerCase().includes(tag.toLowerCase())) ||
        p.name.toLowerCase().includes(tag.toLowerCase()) ||
        p.subcategory.toLowerCase().includes(tag.toLowerCase())
      )
    );
  }

  // Apply in-stock filter
  if (intent.filters.inStock) {
    products = products.filter(p => p.stock > 0);
  }

  // Sort results
  switch (intent.filters.sortBy) {
    case "price_asc":
      products.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      products.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      products.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
      break;
    case "popularity":
      products.sort((a, b) => b.reviewCount - a.reviewCount);
      break;
    case "delivery":
      products.sort((a, b) => a.deliveryMinutes - b.deliveryMinutes);
      break;
  }

  return {
    products,
    intent
  };
}

/**
 * Get search suggestions based on query
 */
export function getSearchSuggestions(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const suggestions: string[] = [];

  // Common search patterns
  const patterns = [
    "healthy breakfast",
    "high protein snacks",
    "under ₹200",
    "best coffee",
    "family pack detergent",
    "snacks for office",
    "baby care essentials",
    "instant noodles",
    "fresh fruits",
    "breakfast combo",
    "protein rich food",
    "dairy products",
    "beverages",
    "bakery items",
    "household supplies"
  ];

  // Find matching patterns
  for (const pattern of patterns) {
    if (pattern.includes(lowerQuery) || lowerQuery.includes(pattern.split(" ")[0])) {
      suggestions.push(pattern);
    }
  }

  // Add category-based suggestions
  const categories = [
    "Dairy & Breakfast",
    "Snacks",
    "Beverages",
    "Bakery",
    "Household",
    "Personal Care",
    "Baby Care",
    "Instant Food",
    "Staples",
    "Fruits & Vegetables"
  ];

  for (const category of categories) {
    if (category.toLowerCase().includes(lowerQuery)) {
      suggestions.push(category);
    }
  }

  return suggestions.slice(0, 5);
}