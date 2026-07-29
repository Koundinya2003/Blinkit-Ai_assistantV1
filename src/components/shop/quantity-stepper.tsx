"use client";

import { Minus, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";
import { useState } from "react";

export function QuantityStepper({ productId }: { productId: string }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const quantity = items.find((item) => item.productId === productId)?.quantity ?? 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    addItem(productId);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    updateQuantity(productId, quantity - 1);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    addItem(productId);
    setTimeout(() => setIsAnimating(false), 300);
  };

  if (!quantity) {
    return (
      <Button
        size="sm"
        onClick={handleAdd}
        className="add-to-cart-btn button-press"
        aria-label="Add to cart"
        type="button"
      >
        <span className="relative z-10 flex items-center gap-1.5">
          {isAnimating ? (
            <>
              <Check className="h-4 w-4" />
              Added
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add
            </>
          )}
        </span>
      </Button>
    );
  }

  return (
    <div className="quantity-stepper animate-scale-in">
      <button
        onClick={handleDecrease}
        aria-label={`Decrease quantity, currently ${quantity}`}
        className="transition-smooth hover:bg-primary/90 active:scale-95 disabled:opacity-50"
        disabled={isAnimating}
        type="button"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <div className="grid place-items-center text-sm font-bold tabular-nums">
        {quantity}
      </div>
      <button
        onClick={handleIncrease}
        aria-label={`Increase quantity, currently ${quantity}`}
        className="transition-smooth hover:bg-primary/90 active:scale-95 disabled:opacity-50"
        disabled={isAnimating}
        type="button"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}