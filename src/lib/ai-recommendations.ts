import type { Product, Recommendation } from "./types";
import { getProductsWithFallback, getProductByIdWithFallback } from "./data-service";

export interface RecommendationOptions {
  userId?: string;
  cartItems?: Array<{ productId: string; quantity: number }>;
  wishlistProductIds?: string[];
  orderHistory?: Array<{ productId: string; quantity: number; category: string }>;
  limit?: number;
}

export interface ScoredProduct extends Product {
  score: number;
  matchReasons: string[];
}

/**
 * Calculate similarity between two products based on multiple factors
 */
function calculateProductSimilarity(productA: Product, productB: Product): number {
  let score = 0;

  // Same category (strong signal)
  if (productA.category === productB.category) {
    score += 3;
  }

  // Same brand (medium signal)
  if (productA.brand === productB.brand) {
    score += 2;
  }

  // Price range similarity (within 20% of each other)
  const priceDiff = Math.abs(productA.price - productB.price) / Math.max(productA.price, productB.price);
  if (priceDiff < 0.2) {
    score += 1.5;
  }

  // Shared tags
  const sharedTags = productA.tags.filter(tag => productB.tags.includes(tag));
  score += sharedTags.length * 0.5;

  // Shared AI signals
  const sharedSignals = productA.aiSignals.filter(signal => productB.aiSignals.includes(signal));
  score += sharedSignals.length * 0.8;

  // Rating similarity (both highly rated)
  if (productA.rating >= 4.5 && productB.rating >= 4.5) {
    score += 0.5;
  }

  return score;
}

/**
 * Get frequently bought together products based on order history
 */
export async function getFrequentlyBoughtTogether(
  productId: string,
  limit: number = 4
): Promise<Recommendation[]> {
  const allProducts = await getProductsWithFallback();
  const targetProduct = await getProductByIdWithFallback(productId);
  
  if (!targetProduct) return [];

  // Score products based on co-purchase patterns
  const productScores = new Map<string, { product: Product; score: number; reasons: string[] }>();

  for (const product of allProducts) {
    if (product.id === productId) continue;

    const similarity = calculateProductSimilarity(targetProduct, product);
    
    if (similarity > 0) {
      const reasons: string[] = [];
      
      if (product.category === targetProduct.category) {
        reasons.push(`Popular in ${product.category.toLowerCase()}`);
      }
      
      if (product.brand === targetProduct.brand) {
        reasons.push(`Same brand: ${product.brand}`);
      }

      const sharedTags = product.tags.filter(tag => targetProduct.tags.includes(tag));
      if (sharedTags.length > 0) {
        reasons.push(`Frequently bought together`);
      }

      productScores.set(product.id, { product, score: similarity, reasons });
    }
  }

  // Sort by score and return top recommendations
  return Array.from(productScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ product, score, reasons }) => ({
      product,
      reason: reasons[0] || "Customers also bought this",
      score: Math.min(score / 10, 1) // Normalize to 0-1
    }));
}

/**
 * Get similar products based on brand, price range, category, and AI signals
 */
export async function getSimilarProducts(
  productId: string,
  limit: number = 6
): Promise<Recommendation[]> {
  const allProducts = await getProductsWithFallback();
  const targetProduct = await getProductByIdWithFallback(productId);
  
  if (!targetProduct) return [];

  const scoredProducts: ScoredProduct[] = allProducts
    .filter(p => p.id !== productId)
    .map(product => {
      const { score, reasons } = calculateSimilarityWithReasons(targetProduct, product);
      return { ...product, score, matchReasons: reasons };
    })
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scoredProducts.map(p => ({
    product: p,
    reason: p.matchReasons[0] || "Similar product",
    score: Math.min(p.score / 10, 1)
  }));
}

function calculateSimilarityWithReasons(target: Product, product: Product): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Category match
  if (target.category === product.category) {
    score += 3;
    reasons.push(`Same category: ${target.category}`);
  }

  // Brand match
  if (target.brand === product.brand) {
    score += 2;
    reasons.push(`Same brand: ${target.brand}`);
  }

  // Price range (within 30%)
  const priceDiff = Math.abs(target.price - product.price) / Math.max(target.price, product.price);
  if (priceDiff < 0.3) {
    score += 1.5;
    reasons.push("Similar price range");
  }

  // Shared tags
  const sharedTags = target.tags.filter(tag => product.tags.includes(tag));
  if (sharedTags.length > 0) {
    score += sharedTags.length * 0.5;
    reasons.push(`Similar features: ${sharedTags.slice(0, 2).join(", ")}`);
  }

  // Shared AI signals
  const sharedSignals = target.aiSignals.filter(signal => product.aiSignals.includes(signal));
  if (sharedSignals.length > 0) {
    score += sharedSignals.length * 0.8;
    reasons.push(`Related products`);
  }

  // Rating comparison
  if (product.rating >= 4.5 && product.reviewCount > 1000) {
    score += 0.5;
    reasons.push(`Highly rated (${product.rating}★)`);
  }

  return { score, reasons };
}

/**
 * Get personalized recommendations based on user behavior
 */
export async function getPersonalizedRecommendations(
  options: RecommendationOptions = {}
): Promise<Recommendation[]> {
  const {
    cartItems = [],
    wishlistProductIds = [],
    orderHistory = [],
    limit = 10
  } = options;

  const allProducts = await getProductsWithFallback();
  const cartProductIds = new Set(cartItems.map(item => item.productId));
  const wishlistSet = new Set(wishlistProductIds);
  
  // Build signal weights from user behavior
  const signalWeights = new Map<string, number>();
  const categoryWeights = new Map<string, number>();
  const brandWeights = new Map<string, number>();

  // Process cart items
  for (const item of cartItems) {
    const product = await getProductByIdWithFallback(item.productId);
    if (!product) continue;

    // Weight by quantity
    const weight = item.quantity * 2;
    
    product.aiSignals.forEach(signal => {
      signalWeights.set(signal, (signalWeights.get(signal) ?? 0) + weight);
    });
    
    product.tags.forEach(tag => {
      signalWeights.set(tag, (signalWeights.get(tag) ?? 0) + weight);
    });

    categoryWeights.set(product.category, (categoryWeights.get(product.category) ?? 0) + weight);
    brandWeights.set(product.brand, (brandWeights.get(product.brand) ?? 0) + weight);
  }

  // Process wishlist
  for (const productId of wishlistProductIds) {
    const product = await getProductByIdWithFallback(productId);
    if (!product) continue;

    product.aiSignals.forEach(signal => {
      signalWeights.set(signal, (signalWeights.get(signal) ?? 0) + 1.5);
    });

    categoryWeights.set(product.category, (categoryWeights.get(product.category) ?? 0) + 1.5);
  }

  // Process order history
  for (const order of orderHistory) {
    categoryWeights.set(order.category, (categoryWeights.get(order.category) ?? 0) + order.quantity);
  }

  // Score all products
  const scoredProducts = allProducts
    .filter(product => !cartProductIds.has(product.id) && !wishlistSet.has(product.id))
    .map(product => {
      let score = 0;
      const reasons: string[] = [];

      // AI signals match
      const matchedSignals = product.aiSignals.filter(signal => signalWeights.has(signal));
      score += matchedSignals.length * 2;
      if (matchedSignals.length > 0) {
        reasons.push(`Matches your interest in ${matchedSignals[0]}`);
      }

      // Tags match
      const matchedTags = product.tags.filter(tag => signalWeights.has(tag));
      score += matchedTags.length * 1.5;

      // Category preference
      const categoryWeight = categoryWeights.get(product.category) ?? 0;
      score += categoryWeight * 0.5;
      if (categoryWeight > 0) {
        reasons.push(`Popular in ${product.category.toLowerCase()}`);
      }

      // Brand preference
      const brandWeight = brandWeights.get(product.brand) ?? 0;
      score += brandWeight * 0.3;
      if (brandWeight > 0) {
        reasons.push(`From ${product.brand}`);
      }

      // Rating boost
      score += product.rating / 5;

      // Review count boost (social proof)
      if (product.reviewCount > 5000) {
        score += 0.5;
        reasons.push(`Highly rated by ${product.reviewCount.toLocaleString()} customers`);
      }

      return { product, score, reasons };
    })
    .filter(p => p.score > 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scoredProducts.map(({ product, score, reasons }) => ({
    product,
    reason: reasons[0] || "Recommended for you",
    score: Math.min(score / 20, 1)
  }));
}

/**
 * Get smart recommendations for product page
 */
export async function getSmartRecommendations(
  productId: string
): Promise<Recommendation[]> {
  const [similar, frequentlyBought] = await Promise.all([
    getSimilarProducts(productId, 4),
    getFrequentlyBoughtTogether(productId, 4)
  ]);

  // Combine and deduplicate
  const recommendations = new Map<string, Recommendation>();
  
  for (const rec of [...similar, ...frequentlyBought]) {
    if (!recommendations.has(rec.product.id)) {
      recommendations.set(rec.product.id, rec);
    } else {
      // Boost score if product appears in both lists
      const existing = recommendations.get(rec.product.id)!;
      existing.score = Math.max(existing.score, rec.score);
      existing.reason = rec.reason;
    }
  }

  return Array.from(recommendations.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}