import { NextResponse } from "next/server";
import { getCategoriesWithFallback } from "@/lib/data-service";

export async function GET() {
  try {
    const categories = await getCategoriesWithFallback();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error in GET /api/categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}