"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AlertCircle, Check, ChevronDown, Repeat, Trash2 } from "lucide-react";
import { displayName, type Product } from "@/lib/catalog";
import type { BasketLine } from "@/lib/ai/types";
import { formatCurrency } from "@/lib/format";
import { productArt } from "@/lib/product-image";
import { cn } from "@/lib/utils";
import { QuantityStepper } from "@/components/shop/quantity-stepper";

/**
 * One ingredient of the plan: what the recipe needs, which real pack covers it,
 * how many, and what else could stand in.
 */
export function PlanLine({
  line,
  requiredLabel,
  onSwap,
  onRemove,
}: {
  line: BasketLine;
  requiredLabel: string;
  onSwap: (productId: string) => void;
  onRemove: () => void;
}) {
  const [showAlternatives, setShowAlternatives] = useState(false);

  if (!line.product) {
    return (
      <div className="flex items-start gap-3 p-3.5">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-muted">
          <AlertCircle className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{line.requirement.label}</p>
          <p className="text-xs text-muted-foreground">Needs {requiredLabel}</p>
          <p className="mt-1 text-xs text-danger">{line.unavailableReason}</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${line.requirement.label}`}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const product = line.product;

  return (
    <div className="p-3.5">
      <div className="flex items-start gap-3">
        <Link
          href={`/product/${product.slug}`}
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted"
        >
          <Image src={productArt(product)} alt="" fill sizes="56px" className="object-cover" unoptimized />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="text-sm font-semibold">{line.requirement.label}</p>
            <p className="text-xs text-muted-foreground">needs {requiredLabel}</p>
            {line.requirement.optional && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Optional
              </span>
            )}
          </div>

          <Link href={`/product/${product.slug}`} className="mt-1 block truncate text-[13px] text-muted-foreground hover:text-foreground">
            {displayName(product)} · {product.pack}
          </Link>

          <p className="mt-1 text-xs text-muted-foreground">
            {line.packs} × {product.pack} = {line.coverage}
            {line.substitutedFor && <span className="ml-1 text-accent">· substituted</span>}
          </p>

          {line.alternatives.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAlternatives((open) => !open)}
              aria-expanded={showAlternatives}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              <Repeat className="h-3.5 w-3.5" aria-hidden />
              {line.alternatives.length} other option{line.alternatives.length > 1 ? "s" : ""}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAlternatives && "rotate-180")} aria-hidden />
            </button>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-sm font-bold tabular-nums">{formatCurrency(line.lineTotal)}</p>
          <QuantityStepper productId={product.id} size="sm" disabled={!product.inStock} />
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${line.requirement.label} from the plan`}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showAlternatives && (
        <ul className="mt-3 space-y-1.5 rounded-lg bg-muted/60 p-2">
          <AlternativeRow product={product} selected onSelect={() => setShowAlternatives(false)} />
          {line.alternatives.map((alternative) => (
            <AlternativeRow
              key={alternative.id}
              product={alternative}
              onSelect={() => {
                onSwap(alternative.id);
                setShowAlternatives(false);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AlternativeRow({
  product,
  selected,
  onSelect,
}: {
  product: Product;
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md border bg-background px-2.5 py-2 text-left transition-colors",
          selected ? "border-primary" : "border-transparent hover:border-border"
        )}
      >
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-muted">
          <Image src={productArt(product)} alt="" fill sizes="36px" className="object-cover" unoptimized />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{displayName(product)}</p>
          <p className="text-[11px] text-muted-foreground">
            {product.pack} · ★ {product.rating}
          </p>
        </div>
        <span className="text-xs font-bold tabular-nums">{formatCurrency(product.price)}</span>
        {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
      </button>
    </li>
  );
}
