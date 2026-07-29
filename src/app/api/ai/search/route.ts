import { NextResponse } from "next/server";
import { z } from "zod";
import { smartSearch, getSearchSuggestions, parseSearchQuery } from "@/lib/ai-search";

const searchRequestSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().positive().max(50).default(20)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = searchRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid search query", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { query, limit } = parsed.data;
    const { products, intent } = await smartSearch(query);

    return NextResponse.json({
      query,
      intent,
      products: products.slice(0, limit),
      count: products.length
    });
  } catch (error) {
    console.error("Error performing search:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  try {
    const { products, intent } = await smartSearch(query);
    const limit = parseInt(searchParams.get("limit") || "20");

    return NextResponse.json({
      query,
      intent,
      products: products.slice(0, limit),
      count: products.length
    });
  } catch (error) {
    console.error("Error performing search:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const suggestions = getSearchSuggestions(query);
    const intent = parseSearchQuery(query);

    return NextResponse.json({
      query,
      suggestions,
      intent
    });
  } catch (error) {
    console.error("Error getting suggestions:", error);
    return NextResponse.json(
      { error: "Failed to get suggestions" },
      { status: 500 }
    );
  }
}