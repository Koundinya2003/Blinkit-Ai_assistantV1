import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getPersonalizedRecommendations,
  getSimilarProducts,
  getFrequentlyBoughtTogether,
  getSmartRecommendations
} from "@/lib/ai-recommendations";

const recommendationRequestSchema = z.object({
  type: z.enum(["personalized", "similar", "frequently_bought", "smart"]).default("personalized"),
  productId: z.string().optional(),
  userId: z.string().optional(),
  cartItems: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive()
  })).optional(),
  wishlistProductIds: z.array(z.string()).optional(),
  orderHistory: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
    category: z.string()
  })).optional(),
  limit: z.number().int().positive().max(20).default(6)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = recommendationRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { type, productId, ...options } = parsed.data;
    let recommendations;

    switch (type) {
      case "similar":
        if (!productId) {
          return NextResponse.json(
            { error: "productId is required for similar products" },
            { status: 400 }
          );
        }
        recommendations = await getSimilarProducts(productId, options.limit);
        break;

      case "frequently_bought":
        if (!productId) {
          return NextResponse.json(
            { error: "productId is required for frequently bought together" },
            { status: 400 }
          );
        }
        recommendations = await getFrequentlyBoughtTogether(productId, options.limit);
        break;

      case "smart":
        if (!productId) {
          return NextResponse.json(
            { error: "productId is required for smart recommendations" },
            { status: 400 }
          );
        }
        recommendations = await getSmartRecommendations(productId);
        break;

      case "personalized":
      default:
        recommendations = await getPersonalizedRecommendations({
          userId: options.userId,
          cartItems: options.cartItems,
          wishlistProductIds: options.wishlistProductIds,
          orderHistory: options.orderHistory,
          limit: options.limit
        });
        break;
    }

    return NextResponse.json({
      type,
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as "personalized" | "similar" | "frequently_bought" | "smart" | null;
  const productId = searchParams.get("productId");
  const limit = parseInt(searchParams.get("limit") || "6");

  try {
    let recommendations;

    switch (type) {
      case "similar":
        if (!productId) {
          return NextResponse.json(
            { error: "productId query parameter is required for similar products" },
            { status: 400 }
          );
        }
        recommendations = await getSimilarProducts(productId, limit);
        break;

      case "frequently_bought":
        if (!productId) {
          return NextResponse.json(
            { error: "productId query parameter is required for frequently bought together" },
            { status: 400 }
          );
        }
        recommendations = await getFrequentlyBoughtTogether(productId, limit);
        break;

      case "smart":
        if (!productId) {
          return NextResponse.json(
            { error: "productId query parameter is required for smart recommendations" },
            { status: 400 }
          );
        }
        recommendations = await getSmartRecommendations(productId);
        break;

      case "personalized":
      default:
        recommendations = await getPersonalizedRecommendations({ limit });
        break;
    }

    return NextResponse.json({
      type: type || "personalized",
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}