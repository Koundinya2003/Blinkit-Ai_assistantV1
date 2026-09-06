"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, Star } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { formatCount, formatCurrency } from "@/lib/format";
import { productArt } from "@/lib/product-image";
import { QuantityStepper } from "./quantity-stepper";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="surface-card group flex h-full flex-col overflow-hidden shadow-card transition-shadow hover:shadow-pop">
      <Link href={`/product/${product.slug}`} className="block p-2.5 pb-0">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          <Image
            src={productArt(product)}
            alt={`${product.brand} ${product.name}`}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 180px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
          {product.discountPercent > 0 && (
            <span className="absolute left-0 top-2 rounded-r-md bg-[#256fef] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {product.discountPercent}% OFF
            </span>
          )}
          {!product.inStock && (
            <span className="absolute inset-0 grid place-items-center bg-white/70 text-xs font-bold text-muted-foreground">
              Out of stock
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-2.5 pt-2">
        <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
          <Clock className="h-3 w-3" aria-hidden />
          {product.etaMinutes} MINS
        </p>

        <Link href={`/product/${product.slug}`} className="mt-1 block">
          <h3 className="line-clamp-2 min-h-[2.4rem] text-[13px] font-semibold leading-tight">{product.name}</h3>
        </Link>

        <p className="mt-1 text-xs text-muted-foreground">{product.pack}</p>

        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Star className="h-3 w-3 fill-primary text-primary" aria-hidden />
          <span className="font-semibold text-foreground">{product.rating}</span>
          <span>({formatCount(product.ratings)})</span>
        </p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            <p className="text-sm font-bold">{formatCurrency(product.price)}</p>
            {product.discountPercent > 0 && (
              <p className="text-xs text-muted-foreground line-through">{formatCurrency(product.mrp)}</p>
            )}
          </div>
          <QuantityStepper productId={product.id} disabled={!product.inStock} size="sm" />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
