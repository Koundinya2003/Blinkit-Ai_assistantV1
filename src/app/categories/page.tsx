import type { Metadata } from "next";
import Link from "next/link";
import { catalog } from "@/lib/catalog";
import { pluralise } from "@/lib/format";

export const metadata: Metadata = { title: "All categories" };

export default function CategoriesPage() {
  const categories = catalog.categories();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">All categories</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.id}`}
            className="surface-card flex items-start gap-3 p-4 transition-colors hover:border-primary"
          >
            <span className="text-2xl" aria-hidden>
              {category.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold">{category.name}</p>
              <p className="text-xs text-muted-foreground">{category.tagline}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{pluralise(category.productCount, "product")}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
