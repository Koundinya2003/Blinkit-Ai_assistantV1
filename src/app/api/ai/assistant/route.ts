import { NextResponse } from "next/server";
import { z } from "zod";
import { aiAssistant } from "@/lib/ai/assistant";

const assistantRequestSchema = z.object({
  query: z.string().min(1).max(500),
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
  })).optional()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = assistantRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { query, ...context } = parsed.data;
    
    // Initialize assistant if needed
    await aiAssistant.initialize();
    
    const response = await aiAssistant.processQuery(query, context);

    return NextResponse.json({
      ...response,
      query
    });
  } catch (error) {
    console.error("Error processing assistant query:", error);
    return NextResponse.json(
      { error: "Failed to process query" },
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
    // Initialize assistant if needed
    await aiAssistant.initialize();
    
    const response = await aiAssistant.processQuery(query);

    return NextResponse.json({
      ...response,
      query
    });
  } catch (error) {
    console.error("Error processing assistant query:", error);
    return NextResponse.json(
      { error: "Failed to process query" },
      { status: 500 }
    );
  }
}