import { getProducts } from "@/lib/firebase/products";
import { getCategories } from "@/lib/firebase/categories";
import { checkFirestoreHealth, isFirestoreHealthy } from "@/lib/firebase";
import { products as localProducts, categories as localCategories } from "@/lib/catalog";
import { products as seedDataProducts } from "@/lib/seed-data";
import type { Product, CategoryDoc } from "@/lib/types";

let productsCache: Product[] | null = null;
let categoriesCache: CategoryDoc[] | null = null;
let productByIdCache: Map<string, Product> | null = null;
let productBySlugCache: Map<string, Product> | null = null;

// Fast-fail: if Firestore fails once, skip it for subsequent calls
let firestoreAvailable: boolean | null = null;

// Reduced timeout — 1000ms instead of 3000ms
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 1000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

// Pre-check Firestore health before attempting queries.
// This fires a lightweight health check in parallel with cache checks
// and provides an immediate fallback path.
async function isFirestoreReachable(): Promise<boolean> {
  const cached = isFirestoreHealthy();
  if (cached !== null) return cached;
  return checkFirestoreHealth();
}

function getFallbackProducts(): Product[] {
  const merged = [...localProducts, ...seedDataProducts];
  const uniqueBySlug = new Map<string, Product>();

  for (const product of merged) {
    if (!uniqueBySlug.has(product.slug)) {
      uniqueBySlug.set(product.slug, product);
    }
  }

  return Array.from(uniqueBySlug.values());
}

// Build lookup maps from the cached product array
function buildLookupMaps(products: Product[]) {
  productByIdCache = new Map(products.map((p) => [p.id, p]));
  productBySlugCache = new Map(products.map((p) => [p.slug, p]));
}

export async function getProductsWithFallback(): Promise<Product[]> {
  if (productsCache) return productsCache;

  // Fast-fail: skip Firestore if we already know it's unavailable
  if (firestoreAvailable === false) {
    productsCache = getFallbackProducts();
    buildLookupMaps(productsCache);
    return productsCache;
  }

  // Pre-flight health check: if Firestore is known unreachable, skip immediately
  if (firestoreAvailable === null) {
    const healthy = await isFirestoreReachable();
    if (!healthy) {
      firestoreAvailable = false;
      productsCache = getFallbackProducts();
      buildLookupMaps(productsCache);
      return productsCache;
    }
  }

  try {
    const firestoreProducts = await withTimeout(getProducts(), 1000);
    if (firestoreProducts.length > 0) {
      firestoreAvailable = true;
      productsCache = firestoreProducts;
      buildLookupMaps(productsCache);
      return firestoreProducts;
    }
  } catch (error) {
    console.warn("Failed to load products from Firestore, using local catalog:", error);
    firestoreAvailable = false;
  }

  productsCache = getFallbackProducts();
  buildLookupMaps(productsCache);
  return productsCache;
}

export async function getCategoriesWithFallback(): Promise<CategoryDoc[]> {
  if (categoriesCache) return categoriesCache;

  // Fast-fail: skip Firestore if we already know it's unavailable
  if (firestoreAvailable === false) {
    const local = localCategories.map((cat) => ({
      id: cat.name.toLowerCase().replace(/\s+/g, "-"),
      name: cat.name,
      icon: cat.icon,
      description: "",
      productCount: 0,
      image: "",
    })) as CategoryDoc[];
    // Populate productCount from local catalog
    const productCounts = new Map<string, number>();
    for (const p of localProducts) {
      productCounts.set(p.category, (productCounts.get(p.category) || 0) + 1);
    }
    local.forEach((cat) => {
      cat.productCount = productCounts.get(cat.name) || 0;
    });
    categoriesCache = local;
    return categoriesCache;
  }

  try {
    const firestoreCategories = await withTimeout(getCategories(), 1000);
    if (firestoreCategories.length > 0) {
      firestoreAvailable = true;
      categoriesCache = firestoreCategories;
      return categoriesCache;
    }
  } catch (error) {
    console.warn("Failed to load categories from Firestore, using local catalog:", error);
    firestoreAvailable = false;
  }

  const local = localCategories.map((cat) => ({
    id: cat.name.toLowerCase().replace(/\s+/g, "-"),
    name: cat.name,
    icon: cat.icon,
    description: "",
    productCount: 0,
    image: "",
  })) as CategoryDoc[];
  const productCounts = new Map<string, number>();
  for (const p of localProducts) {
    productCounts.set(p.category, (productCounts.get(p.category) || 0) + 1);
  }
  local.forEach((cat) => {
    cat.productCount = productCounts.get(cat.name) || 0;
  });
  categoriesCache = local;
  return categoriesCache;
}

// Use cache instead of re-fetching from Firestore
export async function getProductBySlugWithFallback(slug: string): Promise<Product | null> {
  // Try cache first — use local variable to avoid TS narrowing issues
  const cache = productBySlugCache;
  if (cache) {
    return cache.get(slug) || null;
  }
  // Ensure cache is populated
  await getProductsWithFallback();
  return productBySlugCache?.get(slug) || getFallbackProducts().find((p) => p.slug === slug) || null;
}

// Use cache instead of re-fetching from Firestore
export async function getProductByIdWithFallback(id: string): Promise<Product | null> {
  // Try cache first — use local variable to avoid TS narrowing issues
  const cache = productByIdCache;
  if (cache) {
    return cache.get(id) || null;
  }
  // Ensure cache is populated
  await getProductsWithFallback();
  return productByIdCache?.get(id) || getFallbackProducts().find((p) => p.id === id) || null;
}

export async function getProductsByCategoryWithFallback(category: string): Promise<Product[]> {
  const allProducts = await getProductsWithFallback();
  return allProducts.filter((p) => p.category === category);
}

export async function searchProductsWithFallback(searchQuery: string): Promise<Product[]> {
  const term = searchQuery.trim().toLowerCase();
  if (!term) return [];

  const allProducts = await getProductsWithFallback();
  return allProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(term) ||
      p.brand.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term) ||
      p.subcategory.toLowerCase().includes(term) ||
      p.tags.some((t) => t.toLowerCase().includes(term))
  );
}

// ---------------------------------------------------------------------------
// Synchronous cache lookups
//
// These read from the cached Firestore data (populated by getProductsWithFallback)
// so every part of the app — cart, pricing, orders, AI recommendations — uses
// the exact same product model and the same image field. If the cache has not
// been populated yet, they fall back to the local catalog as a last resort.
// ---------------------------------------------------------------------------
export function getProductById(productId: string): Product | null {
  if (productByIdCache) {
    const cached = productByIdCache.get(productId);
    if (cached) return cached;
  }
  return localProducts.find((p) => p.id === productId) || null;
}

export function getAllProducts(): Product[] {
  return productsCache || localProducts;
}

export function clearCache(): void {
  productsCache = null;
  categoriesCache = null;
  productByIdCache = null;
  productBySlugCache = null;
  firestoreAvailable = null;
}
