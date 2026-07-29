import { NextResponse } from "next/server";
import { getReviewsByProductIdSorted } from "@/lib/firebase-reviews";

type SortOption = "latest" | "rating" | "helpful";

function validateSort(sort: string | null): SortOption {
  if (!sort) return "latest";
  const validSorts: SortOption[] = ["latest", "rating", "helpful"];
  return validSorts.includes(sort as SortOption) ? (sort as SortOption) : "latest";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    
    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    const sort = validateSort(new URL(request.url).searchParams.get("sort"));
    const reviews = await getReviewsByProductIdSorted(productId, sort);

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Error in GET /api/reviews/[productId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}