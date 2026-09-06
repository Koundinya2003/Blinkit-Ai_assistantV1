import { NextResponse } from "next/server";
import { catalog } from "@/lib/catalog";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const search = params.get("q")?.trim();
  const category = params.get("category");
  const limit = Math.min(100, Math.max(1, Number.parseInt(params.get("limit") ?? "40", 10) || 40));
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);

  let items = search ? catalog.search(search, 500) : category ? catalog.byCategory(category) : catalog.all();

  if (search && category) items = items.filter((product) => product.categoryId === category);

  const start = (page - 1) * limit;
  return NextResponse.json({
    items: items.slice(start, start + limit),
    total: items.length,
    page,
    pages: Math.max(1, Math.ceil(items.length / limit)),
  });
}
