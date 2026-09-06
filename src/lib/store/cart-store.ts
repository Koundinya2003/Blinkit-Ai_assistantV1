"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { catalog } from "@/lib/catalog";
import type { Product } from "@/lib/catalog";
import { computeTotals, type CartTotals } from "@/lib/shop/pricing";

export type CartItem = {
  productId: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  /** Set once the persisted cart has been read, so SSR and client agree. */
  hydrated: boolean;
};

type CartActions = {
  add: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  addMany: (entries: CartItem[]) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const MAX_PER_ITEM = 20;

export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      hydrated: false,

      add: (productId, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((item) => item.productId === productId);
          if (!existing) return { items: [...state.items, { productId, quantity }] };
          return {
            items: state.items.map((item) =>
              item.productId === productId
                ? { ...item, quantity: Math.min(MAX_PER_ITEM, item.quantity + quantity) }
                : item
            ),
          };
        }),

      setQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((item) => item.productId !== productId) };
          }
          const exists = state.items.some((item) => item.productId === productId);
          if (!exists) {
            return { items: [...state.items, { productId, quantity: Math.min(MAX_PER_ITEM, quantity) }] };
          }
          return {
            items: state.items.map((item) =>
              item.productId === productId
                ? { ...item, quantity: Math.min(MAX_PER_ITEM, quantity) }
                : item
            ),
          };
        }),

      remove: (productId) =>
        set((state) => ({ items: state.items.filter((item) => item.productId !== productId) })),

      clear: () => set({ items: [] }),

      /** Used by "add whole plan to cart" — merges instead of replacing. */
      addMany: (entries) =>
        set((state) => {
          const next = new Map(state.items.map((item) => [item.productId, item.quantity]));
          for (const entry of entries) {
            next.set(entry.productId, Math.min(MAX_PER_ITEM, (next.get(entry.productId) ?? 0) + entry.quantity));
          }
          return {
            items: [...next.entries()].map(([productId, quantity]) => ({ productId, quantity })),
            isOpen: true,
          };
        }),

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: "blinkit-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);

/** Cart items joined with catalogue data, skipping anything delisted. */
export function useCartEntries(): { product: Product; quantity: number }[] {
  const items = useCartStore((state) => state.items);
  const entries: { product: Product; quantity: number }[] = [];
  for (const item of items) {
    const product = catalog.byId(item.productId);
    if (product) entries.push({ product, quantity: item.quantity });
  }
  return entries;
}

export function useCartTotals(): CartTotals {
  return computeTotals(useCartEntries());
}

export function useCartQuantity(productId: string): number {
  return useCartStore((state) => state.items.find((item) => item.productId === productId)?.quantity ?? 0);
}

export function useCartCount(): number {
  return useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
}
