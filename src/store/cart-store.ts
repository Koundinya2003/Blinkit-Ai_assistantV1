"use client";

import { create } from "zustand";
import type { CartItem } from "@/lib/types";

type CartState = {
  items: CartItem[];
  loading: boolean;
  error: string | null;
  isCartOpen: boolean;
};

type CartActions = {
  addItem: (productId: string, quantity?: number, priceAtAdd?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
  setItems: (items: CartItem[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
};

type CartStore = CartState & CartActions;

export const useCartStore = create<CartStore>((set) => ({
  // Initial state — loading starts false so drawer doesn't show spinner forever
  items: [],
  loading: false,
  error: null,
  isCartOpen: false,

  // Actions — synchronous optimistic updates only
  addItem: (productId: string, quantity: number = 1, priceAtAdd: number = 0) => {
    set((state) => {
      const existing = state.items.find(item => item.productId === productId);
      const newItems = existing
        ? state.items.map(item =>
            item.productId === productId
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        : [...state.items, { productId, quantity, priceAtAdd, addedAt: new Date() }];

      return { ...state, items: newItems, error: null };
    });
  },

  removeItem: (productId: string) => {
    set((state) => ({
      ...state,
      items: state.items.filter(item => item.productId !== productId),
      error: null
    }));
  },

  updateQuantity: (productId: string, quantity: number) => {
    set((state) => {
      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(item => item.productId !== productId),
          error: null
        };
      }

      return {
        ...state,
        items: state.items.map(item =>
          item.productId === productId ? { ...item, quantity } : item
        ),
        error: null
      };
    });
  },

  clearCart: () => {
    set((state) => ({
      ...state,
      items: [],
      error: null
    }));
  },

  refreshCart: async () => {
    // This will be called by the cart hook to sync with storage
  },

  openCart: () => set((state) => ({ ...state, isCartOpen: true })),
  closeCart: () => set((state) => ({ ...state, isCartOpen: false })),
  setItems: (items) => set((state) => ({ ...state, items })),
  setLoading: (loading) => set((state) => ({ ...state, loading })),
  setError: (error) => set((state) => ({ ...state, error })),
}));