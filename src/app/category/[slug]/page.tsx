import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/shop/product-card";
import { catalog, TAXONOMY, getCategoryEntry } from "@/lib/catalog";
import { pluralise } from "@/lib/format";

export function generateStaticParams() {
  return TAXONOMY.map((entry) => ({ slug: entry.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getCategoryEntry(slug);
  return entry ? { title: entry.name, description: entry.tagline } : { title: "Category" };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sub?: string; sort?: string }>;
}) {
  const { slug } = await params;
  const { sub, sort } = await searchParams;

  const entry = getCategoryEntry(slug);
  if (!entry) notFound();

  const all = catalog.byCategory(slug);
  if (!all.length) notFound();

  const subcategories = [...new Set(all.map((product) => product.subcategory))].sort();
  const filtered = sub ? all.filter((product) => product.subcategory === sub) : all;

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "discount") return b.discountPercent - a.discountPercent;
    return b.rating - a.rating;
  });

  const href = (next: { sub?: string; sort?: string }) => {
    const search = new URLSearchParams();
    const nextSub = next.sub ?? sub;
    const nextSort = next.sort ?? sort;
    if (nextSub) search.set("sub", nextSub);
    if (nextSort) search.set("sort", nextSort);
    const qs = search.toString();
    return `/category/${slug}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <nav className="text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        {" / "}
        <Link href="/categories" className="hover:text-primary">
          Categories
        </Link>
        {" / "}
        <span className="text-foreground">{entry.name}</span>
      </nav>

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">
            <span className="mr-2" aria-hidden>
              {entry.emoji}
            </span>
            {entry.name}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{pluralise(sorted.length, "product")} · {entry.tagline}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            ["rating", "Popular"],
            ["price-asc", "Price: low to high"],
            ["price-desc", "Price: high to low"],
            ["discount", "Biggest savings"],
          ].map(([value, label]) => (
            <Link
              key={value}
              href={href({ sort: value })}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                (sort ?? "rating") === value ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {subcategories.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <Link
            href={`/category/${slug}${sort ? `?sort=${sort}` : ""}`}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              !sub ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary"
            }`}
          >
            All
          </Link>
          {subcategories.map((name) => (
            <Link
              key={name}
              href={href({ sub: name })}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                sub === name ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary"
              }`}
            >
              {name}
            </Link>
          ))}
        </div>
      )}

      <ProductGrid products={sorted} />
    </div>
  );
}
