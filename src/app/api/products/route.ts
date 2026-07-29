import { NextResponse } from "next/server";
import { getProductsWithFallback, searchProductsWithFallback } from "@/lib/data-service";
import type { Product } from "@/lib/types";

type SortOption = "price-low-high" | "price-high-low" | "rating" | "discount" | "newest";

function validateSort(sort: string | null): SortOption | null {
  if (!sort) return null;
  const validSorts: SortOption[] = ["price-low-high", "price-high-low", "rating", "discount", "newest"];
  return validSorts.includes(sort as SortOption) ? (sort as SortOption) : null;
}

function sortProducts(products: Product[], sortBy: SortOption | null): Product[] {
  if (!sortBy) return products;

  const sorted = [...products];
  switch (sortBy) {
    case "price-low-high":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-high-low":
      return sorted.sort((a, b) => b.price - a.price);
    case "rating":
      return sorted.sort((a, b) => b.rating - a.rating);
    case "discount":
      return sorted.sort((a, b) => b.discount - a.discount);
    case "newest":
      return sorted.sort((a, b) => (b.id > a.id ? 1 : -1));
    default:
      return sorted;
  }
}

function filterProducts(products: Product[], filters: {
  category?: string;
  subcategory?: string;
  brand?: string;
  search?: string;
}): Product[] {
  let filtered = products;

  if (filters.category) {
    filtered = filtered.filter(p => p.category === filters.category);
  }

  if (filters.subcategory) {
    filtered = filtered.filter(p => p.subcategory.toLowerCase() === filters.subcategory!.toLowerCase());
  }

  if (filters.brand) {
    filtered = filtered.filter(p => p.brand.toLowerCase() === filters.brand!.toLowerCase());
  }

  if (filters.search) {
    const term = filters.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.subcategory.toLowerCase().includes(term) ||
        p.tags.some((t) => t.toLowerCase().includes(term))
    );
  }

  return filtered;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const category = searchParams.get("category") || undefined;
    const subcategory = searchParams.get("subcategory") || undefined;
    const brand = searchParams.get("brand") || undefined;
    const search = searchParams.get("search") || undefined;
    const sort = validateSort(searchParams.get("sort"));
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));

    let products: Product[];
    
    if (search) {
      products = await searchProductsWithFallback(search);
    } else {
      products = await getProductsWithFallback();
    }

    const filtered = filterProducts(products, { category, subcategory, brand, search });
    const sorted = sortProducts(filtered, sort);
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const paginatedItems = sorted.slice(start, start + limit);

    return NextResponse.json({
      items: paginatedItems,
      total,
      page,
      pages: totalPages
    });
  } catch (error) {
    console.error("Error in GET /api/products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}