import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Leaf, ShieldCheck, Sparkles, Star, Truck } from "lucide-react";
import { ProductGrid } from "@/components/shop/product-card";
import { QuantityStepper } from "@/components/shop/quantity-stepper";
import { catalog, formatAmount } from "@/lib/catalog";
import { formatCount, formatCurrency } from "@/lib/format";
import { productArt } from "@/lib/product-image";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = catalog.bySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: `${product.brand} ${product.name}, ${product.pack}`,
    description: product.description,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = catalog.bySlug(slug);
  if (!product) notFound();

  const similar = catalog
    .byCategory(product.categoryId)
    .filter((item) => item.id !== product.id && item.subcategory === product.subcategory)
    .slice(0, 6);

  const alsoInAisle = catalog
    .byCategory(product.categoryId)
    .filter((item) => item.id !== product.id && item.subcategory !== product.subcategory)
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <nav className="text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        {" / "}
        <Link href={`/category/${product.categoryId}`} className="hover:text-primary">
          {product.categoryName}
        </Link>
        {" / "}
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="surface-card relative aspect-square overflow-hidden">
          <Image
            src={productArt(product)}
            alt={`${product.brand} ${product.name}`}
            fill
            sizes="(max-width: 768px) 100vw, 480px"
            className="object-cover"
            priority
            unoptimized
          />
          {product.discountPercent > 0 && (
            <span className="absolute left-4 top-4 rounded-md bg-[#256fef] px-2 py-1 text-xs font-bold text-white">
              {product.discountPercent}% OFF
            </span>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{product.brand}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">{product.name}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
              <Star className="h-3 w-3 fill-primary" aria-hidden />
              {product.rating}
            </span>
            <span className="text-xs text-muted-foreground">{formatCount(product.ratings)} ratings</span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {product.etaMinutes} mins
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold ${
                product.diet === "veg" ? "border-primary text-primary" : "border-danger text-danger"
              }`}
            >
              <Leaf className="h-3 w-3" aria-hidden />
              {product.diet === "veg" ? "Veg" : product.diet === "egg" ? "Contains egg" : "Non-veg"}
            </span>
          </div>

          <div className="surface-card mt-5 p-4">
            <p className="text-xs font-semibold text-muted-foreground">{product.pack}</p>
            <div className="mt-1 flex flex-wrap items-end gap-3">
              <span className="text-2xl font-black">{formatCurrency(product.price)}</span>
              {product.discountPercent > 0 && (
                <span className="text-sm text-muted-foreground line-through">{formatCurrency(product.mrp)}</span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatCurrency(product.unitPrice * (product.packUnit === "piece" ? 1 : 100))} per{" "}
                {product.packUnit === "piece" ? "piece" : formatAmount(100, product.packUnit)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Inclusive of all taxes</p>

            <div className="mt-4 flex items-center gap-3">
              <QuantityStepper productId={product.id} disabled={!product.inStock} />
              {product.inStock ? (
                <span className="text-xs text-muted-foreground">{product.stock} in stock nearby</span>
              ) : (
                <span className="text-xs font-semibold text-danger">Out of stock right now</span>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Assurance icon={<Truck className="h-4 w-4" />} label="Superfast delivery" />
            <Assurance icon={<ShieldCheck className="h-4 w-4" />} label="Best prices" />
            <Assurance icon={<Sparkles className="h-4 w-4" />} label="Wide assortment" />
          </div>

          <div className="surface-card mt-4 p-4">
            <h2 className="text-sm font-bold">Product details</h2>
            <p className="mt-2 text-sm text-muted-foreground">{product.description}</p>
            <dl className="mt-3 grid grid-cols-2 gap-y-2 text-xs">
              <Detail label="Brand" value={product.brand} />
              <Detail label="Pack size" value={product.pack} />
              <Detail label="Category" value={product.categoryName} />
              <Detail label="Type" value={product.subcategory} />
            </dl>
          </div>

          {product.ingredientKeys.length > 0 && (
            <div className="surface-card mt-4 p-4">
              <p className="flex items-center gap-1.5 text-sm font-bold">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                Cook with this
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Blinkit can plan a whole meal around this and work out how much you need.
              </p>
              <Link
                href={`/plan?q=${encodeURIComponent(`I want to cook something with ${product.name} for 2`)}`}
                className="mt-3 inline-flex text-sm font-bold text-primary"
              >
                Build a basket around {product.name} →
              </Link>
            </div>
          )}
        </div>
      </div>

      {similar.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Similar {product.subcategory.toLowerCase()}</h2>
          <ProductGrid products={similar} />
        </section>
      )}

      {alsoInAisle.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">More from {product.categoryName}</h2>
          <ProductGrid products={alsoInAisle} />
        </section>
      )}
    </div>
  );
}

function Assurance({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="surface-card flex flex-col items-center gap-1 p-3">
      <span className="text-primary" aria-hidden>
        {icon}
      </span>
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </>
  );
}
