import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "Blinkit AI Shopping Intelligence API",
    version: "1.0.0",
    endpoints: {
      recommendations: {
        path: "/api/ai/recommendations",
        methods: ["GET", "POST"],
        description: "Get product recommendations (personalized, similar, frequently bought together, smart)"
      },
      search: {
        path: "/api/ai/search",
        methods: ["GET", "POST", "PUT"],
        description: "Natural language search with intent parsing"
      },
      assistant: {
        path: "/api/ai/assistant",
        methods: ["GET", "POST"],
        description: "AI shopping assistant for natural language queries"
      },
      recipe: {
        path: "/api/ai/recipe",
        methods: ["GET", "POST"],
        description: "Recipe mode - find ingredients and generate shopping lists"
      }
    }
  });
}