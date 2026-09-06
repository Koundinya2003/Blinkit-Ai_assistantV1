"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore, useCartQuantity } from "@/lib/store/cart-store";

export function QuantityStepper({
  productId,
  disabled,
  size = "md",
  className,
}: {
  productId: string;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const quantity = useCartQuantity(productId);
  const add = useCartStore((state) => state.add);
  const setQuantity = useCartStore((state) => state.setQuantity);

  const height = size === "sm" ? "h-8" : "h-9";
  const text = size === "sm" ? "text-xs" : "text-sm";

  if (disabled) {
    return (
      <span className={cn("inline-flex items-center justify-center rounded-[10px] border border-border px-3 font-semibold text-muted-foreground", height, text, className)}>
        Sold out
      </span>
    );
  }

  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={() => add(productId)}
        aria-label="Add to cart"
        className={cn(
          "inline-flex items-center justify-center rounded-[10px] border border-primary bg-primary/5 px-4 font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary hover:text-primary-foreground",
          height,
          text,
          className
        )}
      >
        Add
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-grid grid-cols-3 items-center overflow-hidden rounded-[10px] bg-primary font-bold text-primary-foreground",
        height,
        text,
        size === "sm" ? "w-[84px]" : "w-[96px]",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setQuantity(productId, quantity - 1)}
        aria-label={quantity === 1 ? "Remove from cart" : "Decrease quantity"}
        className="grid h-full place-items-center transition-colors hover:bg-black/10"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="text-center tabular-nums" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => add(productId)}
        aria-label="Increase quantity"
        className="grid h-full place-items-center transition-colors hover:bg-black/10"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
