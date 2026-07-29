"use client";

import { useEffect, useCallback, useRef } from "react";
import { useCartStore } from "@/store/cart-store";
import { useAuth } from "@/lib/firebase-auth";
import {
  getCart,
  createCart,
  addToCart as addToFirestoreCart,
  removeFromCart as removeFromFirestoreCart,
  updateCartItemQuantity as updateFirestoreCartItemQuantity,
  clearCart as clearFirestoreCart
} from "@/lib/firebase-cart";
import {
  getLocalCart,
  addToLocalCart,
  removeFromLocalCart,
  updateLocalCartItemQuantity,
  clearLocalCart,
  deleteLocalCart
} from "@/lib/local-cart";

export function useCart() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const {
    items,
    loading,
    error,
    isCartOpen,
    setItems,
    setLoading,
    setError,
    openCart,
    closeCart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart
  } = useCartStore();

  // Load cart based on auth state
  const loadCart = useCallback(async () => {
    if (authLoading) return;

    try {
      setLoading(true);
      setError(null);

      if (isAuthenticated && user) {
        // Load from Firestore
        let cart = await getCart(user.id);
        
        // If no cart exists, create one
        if (!cart) {
          cart = await createCart(user.id, []);
        }

        setItems(cart.items);
      } else {
        // Load from local storage
        const localCart = getLocalCart();
        setItems(localCart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          priceAtAdd: 0,
          addedAt: new Date()
        })));
      }
    } catch (error) {
      console.error("Error loading cart:", error);
      setError("Failed to load cart");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, authLoading, setItems, setLoading, setError]);

  // Merge local cart to Firestore when user signs in
  const mergeLocalCartToUserCart = useCallback(async (userId: string) => {
    try {
      const localCart = getLocalCart();
      
      if (localCart.items.length === 0) {
        return;
      }

      // Get existing Firestore cart
      const existingCart = await getCart(userId);
      const existingItems = existingCart?.items || [];

      // Merge items
      const mergedItems = [...existingItems];
      
      for (const localItem of localCart.items) {
        const existingIndex = mergedItems.findIndex(
          item => item.productId === localItem.productId
        );

        if (existingIndex >= 0) {
          // Merge quantities
          mergedItems[existingIndex] = {
            ...mergedItems[existingIndex],
            quantity: mergedItems[existingIndex].quantity + localItem.quantity
          };
        } else {
          // Add new item
          mergedItems.push({
            productId: localItem.productId,
            quantity: localItem.quantity,
            priceAtAdd: 0,
            addedAt: new Date()
          });
        }
      }

      // Update Firestore
      await createCart(userId, mergedItems);

      // Clear local cart
      deleteLocalCart();

      // Update state
      setItems(mergedItems);
    } catch (error) {
      console.error("Error merging carts:", error);
      setError("Failed to merge carts");
    }
  }, [setItems, setError]);

  // Track previous user id to detect sign-in
  const prevUserIdRef = useRef<string | null>(null);

  // Handle auth state changes
  useEffect(() => {
    const currentUserId = user?.id || null;
    const prevUserId = prevUserIdRef.current;

    // If user just signed in (transition from null to a value), merge carts
    if (currentUserId && !prevUserId) {
      const localCart = getLocalCart();
      if (localCart.items.length > 0) {
        mergeLocalCartToUserCart(currentUserId);
      }
    }

    prevUserIdRef.current = currentUserId;

    // Load cart
    loadCart();
  }, [isAuthenticated, user, loadCart, mergeLocalCartToUserCart]);

  // Add item with persistence
  const addItemWithPersistence = useCallback(async (productId: string, quantity: number = 1, priceAtAdd: number = 0) => {
    // Optimistic update is already done in the store
    addItem(productId, quantity, priceAtAdd);

    try {
      if (isAuthenticated && user) {
        await addToFirestoreCart(user.id, productId, quantity, priceAtAdd);
      } else {
        addToLocalCart(productId, quantity, priceAtAdd);
      }
    } catch (error) {
      console.error("Error adding item:", error);
      // Rollback
      const currentItems = useCartStore.getState().items;
      const existing = currentItems.find(item => item.productId === productId);
      if (existing) {
        const newQuantity = existing.quantity - quantity;
        if (newQuantity <= 0) {
          removeItem(productId);
        } else {
          updateQuantity(productId, newQuantity);
        }
      }
      setError("Failed to add item");
    }
  }, [isAuthenticated, user, addItem, removeItem, updateQuantity, setError]);

  // Remove item with persistence
  const removeItemWithPersistence = useCallback(async (productId: string) => {
    // Optimistic update is already done in the store
    removeItem(productId);

    try {
      if (isAuthenticated && user) {
        await removeFromFirestoreCart(user.id, productId);
      } else {
        removeFromLocalCart(productId);
      }
    } catch (error) {
      console.error("Error removing item:", error);
      setError("Failed to remove item");
      // Reload to get correct state
      loadCart();
    }
  }, [isAuthenticated, user, removeItem, setError, loadCart]);

  // Update quantity with persistence
  const updateQuantityWithPersistence = useCallback(async (productId: string, quantity: number) => {
    // Optimistic update is already done in the store
    updateQuantity(productId, quantity);

    try {
      if (isAuthenticated && user) {
        await updateFirestoreCartItemQuantity(user.id, productId, quantity);
      } else {
        updateLocalCartItemQuantity(productId, quantity);
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      setError("Failed to update quantity");
      // Reload to get correct state
      loadCart();
    }
  }, [isAuthenticated, user, updateQuantity, setError, loadCart]);

  // Clear cart with persistence
  const clearCartWithPersistence = useCallback(async () => {
    // Optimistic update is already done in the store
    clearCart();

    try {
      if (isAuthenticated && user) {
        await clearFirestoreCart(user.id);
      } else {
        clearLocalCart();
      }
    } catch (error) {
      console.error("Error clearing cart:", error);
      setError("Failed to clear cart");
      // Reload to get correct state
      loadCart();
    }
  }, [isAuthenticated, user, clearCart, setError, loadCart]);

  return {
    items,
    loading,
    error,
    isCartOpen,
    addItem: addItemWithPersistence,
    removeItem: removeItemWithPersistence,
    updateQuantity: updateQuantityWithPersistence,
    clearCart: clearCartWithPersistence,
    refreshCart: loadCart,
    openCart,
    closeCart
  };
}

// Helper hook to get cart count - uses store directly to avoid re-renders
export function useCartCount() {
  const items = useCartStore((state) => state.items);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return { count, loading: false };
}

// Helper hook to get cart totals
export function useCartTotals() {
  const { items } = useCart();
  
  const subtotal = items.reduce((sum) => {
    // Note: In a real app, you'd fetch the product price
    // For now, we'll return 0 and let the UI handle it
    return sum;
  }, 0);

  return {
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    items
  };
}