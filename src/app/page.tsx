import Link from "next/link";
import { ArrowRight, Clock, PackageCheck, Sparkles } from "lucide-react";
import { IntentBar } from "@/components/shop/intent-bar";
import { CategoryRail } from "@/components/shop/category-rail";
import { ProductGrid } from "@/components/shop/product-card";
import { catalog } from "@/lib/catalog";

function rail(categoryId: string, count = 6) {
  return catalog
    .byCategory(categoryId)
    .filter((product) => product.inStock)
    .slice(0, count);
}

export default function HomePage() {
  const deals = [...catalog.all()]
    .filter((product) => product.inStock && product.discountPercent >= 15)
    .sort((a, b) => b.discountPercent - a.discountPercent)
    .slice(0, 6);

  const rails = [
    { id: "vegetables-fruits", title: "Fresh vegetables & fruits" },
    { id: "dairy-bread-eggs", title: "Dairy, bread & eggs" },
    { id: "snacks-munchies", title: "Snacks & munchies" },
    { id: "atta-rice-dal", title: "Atta, rice & dal" },
  ];

  return (
    <div className="space-y-8">
      <section className="surface-card overflow-hidden">
        <div className="bg-gradient-to-br from-brand/25 via-brand/10 to-transparent p-6 sm:p-8">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs font-bold text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Intent to basket
          </p>
          <h1 className="mt-4 max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            Don&apos;t search for groceries. Tell Blinkit what you want to accomplish.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            &ldquo;Biryani for 2.&rdquo; &ldquo;Dinner for 4 under ₹600.&rdquo; We plan the meal, work out the
            quantities, pick the packs and hand you a basket.
          </p>
          <IntentBar className="mt-6 max-w-3xl" />
        </div>

        <div className="grid grid-cols-1 divide-y divide-border border-t border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Perk icon={<Clock className="h-4 w-4" />} title="Delivered in minutes" body="Groceries at your door in 8–16 minutes." />
          <Perk icon={<PackageCheck className="h-4 w-4" />} title="Real packs, real prices" body="Every suggestion maps to a product in stock." />
          <Perk icon={<Sparkles className="h-4 w-4" />} title="Quantities worked out" body="No more guessing how much rice serves four." />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Shop by category</h2>
        <CategoryRail />
      </section>

      {deals.length > 0 && (
        <RailSection title="Today's best savings" href="/search?q=offer">
          <ProductGrid products={deals} />
        </RailSection>
      )}

      {rails.map((entry) => {
        const products = rail(entry.id);
        if (!products.length) return null;
        return (
          <RailSection key={entry.id} title={entry.title} href={`/category/${entry.id}`}>
            <ProductGrid products={products} />
          </RailSection>
        );
      })}
    </div>
  );
}

function RailSection({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-bold">{title}</h2>
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
          See all
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      {children}
    </section>
  );
}

function Perk({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 p-4">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden>
        {icon}
      </span>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
