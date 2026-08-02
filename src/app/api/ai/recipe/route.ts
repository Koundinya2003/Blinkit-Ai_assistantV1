import { NextResponse } from "next/server";
import { z } from "zod";
import { aiAssistant } from "@/lib/ai/assistant";

const recipeRequestSchema = z.object({
  query: z.string().min(1).max(500),
  addToCart: z.boolean().optional().default(false)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = recipeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { query, addToCart } = parsed.data;
    
    // Initialize assistant if needed
    await aiAssistant.initialize();
    
    const response = await aiAssistant.processQuery(query);

    // Extract recipe information if the action is recipe
    let recipeInfo = null;
    if (response.action === "recipe") {
      recipeInfo = {
        matchedProducts: response.products || [],
        addToCartAvailable: addToCart || false
      };
    }

    return NextResponse.json({
      ...response,
      recipeInfo,
      query
    });
  } catch (error) {
    console.error("Error processing recipe query:", error);
    return NextResponse.json(
      { error: "Failed to process recipe" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recipeName = searchParams.get("recipe");

  if (!recipeName) {
    return NextResponse.json(
      { error: "Query parameter 'recipe' is required" },
      { status: 400 }
    );
  }

  try {
    // Initialize assistant if needed
    await aiAssistant.initialize();
    
    const response = await aiAssistant.processQuery(`recipe for ${recipeName}`);

    let recipeInfo = null;
    if (response.action === "recipe") {
      recipeInfo = {
        matchedProducts: response.products || [],
        addToCartAvailable: false
      };
    }

    return NextResponse.json({
      ...response,
      recipeInfo,
      recipeName
    });
  } catch (error) {
    console.error("Error processing recipe query:", error);
    return NextResponse.json(
      { error: "Failed to process recipe" },
      { status: 500 }
    );
  }
}