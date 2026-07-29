import { getProductById, products } from "@/lib/catalog";
import type { BasketInsight, CartLine, Product, Recommendation } from "@/lib/types";

function cartProducts(cart: CartLine[]) {
  return cart
    .map((line) => {
      const product = getProductById(line.productId);
      return product ? { product, quantity: line.quantity } : null;
    })
    .filter(Boolean) as { product: Product; quantity: number }[];
}

export function getBasketRecommendations(cart: CartLine[]): Recommendation[] {
  const lines = cartProducts(cart);
  const cartIds = new Set(lines.map(({ product }) => product.id));
  const signalWeights = new Map<string, number>();
  const categoryWeights = new Map<string, number>();
  const subcategoryWeights = new Map<string, number>();

  for (const { product, quantity } of lines) {
    for (const signal of product.aiSignals) {
      signalWeights.set(signal, (signalWeights.get(signal) ?? 0) + 2 * quantity);
    }
    // Strong category weight - same category should dominate
    categoryWeights.set(product.category, (categoryWeights.get(product.category) ?? 0) + quantity * 3);
    // Subcategory weight for finer matching
    subcategoryWeights.set(product.subcategory, (subcategoryWeights.get(product.subcategory) ?? 0) + quantity * 1.5);
  }

  return products
    .filter((product) => !cartIds.has(product.id))
    .map((product) => {
      const categoryWeight = categoryWeights.get(product.category) ?? 0;
      const subcategoryWeight = subcategoryWeights.get(product.subcategory) ?? 0;
      
      const score =
        product.tags.reduce((sum, tag) => sum + (signalWeights.get(tag) ?? 0), 0) +
        product.aiSignals.reduce((sum, signal) => sum + (signalWeights.get(signal) ? 0.5 : 0), 0) +
        categoryWeight * 1.0 +  // Strong category boost
        subcategoryWeight * 0.5 +  // Subcategory boost
        product.rating / 5;

      const matchedTag = product.tags.find((tag) => signalWeights.has(tag));
      const reason = matchedTag
        ? `Often bought with ${matchedTag} baskets`
        : `Fits your ${product.category.toLowerCase()} run`;

      return { product, reason, score };
    })
    .filter((item) => item.score > 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export function getBasketInsights(cart: CartLine[]): BasketInsight[] {
  const lines = cartProducts(cart);
  if (!lines.length) {
    return [
      {
        title: "Start shopping",
        body: "Add daily essentials and Blinkit AI will surface useful pairings.",
        confidence: 0.92
      }
    ];
  }

  const categories = new Set(lines.map(({ product }) => product.category));
  const subtotal = lines.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);
  const hasDairy = categories.has("Dairy & Breakfast");
  const hasProtein = categories.has("Snacks");
  const hasBaby = categories.has("Baby Care");

  const insights: BasketInsight[] = [
    {
      title: `${lines.length} item${lines.length > 1 ? "s" : ""} understood`,
      body: `Basket intent looks like ${Array.from(categories).slice(0, 2).join(" + ")}${categories.size > 2 ? " and more" : ""}.`,
      confidence: 0.88
    }
  ];

  if (hasDairy) {
    insights.push({
      title: "Breakfast pairings detected",
      body: "Bread, cereal, cookies, and coffee are strong matches for milk-led baskets.",
      confidence: 0.91
    });
  }

  if (hasProtein) {
    insights.push({
      title: "Fitness basket pattern",
      body: "Bananas, oats, peanut butter, and Greek yogurt complete protein routines.",
      confidence: 0.89
    });
  }

  if (hasBaby) {
    insights.push({
      title: "Baby care restock",
      body: "Wipes, lotion, and soap are high-confidence diaper add-ons.",
      confidence: 0.93
    });
  }

  if (subtotal > 799) {
    insights.push({
      title: "Value check",
      body: "Your basket is above the usual free delivery threshold in most active zones.",
      confidence: 0.84
    });
  }

  return insights.slice(0, 3);
}

export async function askOpenRouter(cart: CartLine[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const lines = cartProducts(cart);
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "Blinkit AI"
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Blinkit AI. Give concise grocery basket insights for Indian quick commerce shoppers. Never interrupt shopping."
        },
        {
          role: "user",
          content: `Basket: ${lines.map(({ product, quantity }) => `${quantity}x ${product.brand} ${product.name}`).join(", ")}`
        }
      ],
      temperature: 0.3,
      max_tokens: 160
    })
  });

  if (!response.ok) return null;
  return response.json();
}
