import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid } from "@/components/shop/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { catalog } from "@/lib/catalog";
import { pluralise } from "@/lib/format";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query ? catalog.search(query, 120) : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{query ? `Results for “${query}”` : "Search"}</h1>
        {query && (
          <p className="mt-0.5 text-sm text-muted-foreground">{pluralise(results.length, "product")} found</p>
        )}
      </div>

      {!query ? (
        <EmptyState
          emoji="🔎"
          title="Search the store"
          description="Look for a brand or a product — or describe a whole meal and let Blinkit build the basket."
          action={
            <Link href="/plan" className="text-sm font-bold text-primary">
              Try the AI basket builder →
            </Link>
          }
        />
      ) : results.length === 0 ? (
        <EmptyState
          emoji="🫙"
          title={`No products match “${query}”`}
          description="Try a shorter term, or describe what you're cooking and we'll find the ingredients for you."
          action={
            <Link href={`/plan?q=${encodeURIComponent(query)}`} className="text-sm font-bold text-primary">
              Build a basket for “{query}” →
            </Link>
          }
        />
      ) : (
        <ProductGrid products={results} />
      )}
    </div>
  );
}
