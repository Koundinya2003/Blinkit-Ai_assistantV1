"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/firebase/auth";
import {
  getWishlist,
  createWishlist,
  addToWishlist as addToFirestoreWishlist,
  removeFromWishlist as removeFromFirestoreWishlist,
  toggleWishlist as toggleFirestoreWishlist
} from "@/lib/firebase/wishlist";

type WishlistState = {
  productIds: string[];
  loading: boolean;
  error: string | null;
};

type WishlistActions = {
  addItem: (productId: string) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  toggleItem: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  refreshWishlist: () => Promise<void>;
};

type WishlistContextValue = WishlistState & WishlistActions;

const initialState: WishlistState = {
  productIds: [],
  loading: true,
  error: null
};

export function useWishlist(): WishlistContextValue {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [state, setState] = useState<WishlistState>(initialState);

  // Load wishlist based on auth state
  const loadWishlist = useCallback(async () => {
    if (authLoading) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      if (isAuthenticated && user) {
        // Load from Firestore
        let wishlist = await getWishlist(user.id);
        
        // If no wishlist exists, create one
        if (!wishlist) {
          wishlist = await createWishlist(user.id, []);
        }

        setState({
          productIds: wishlist.productIds,
          loading: false,
          error: null
        });
      } else {
        // Guest users don't have persistent wishlist
        setState({
          productIds: [],
          loading: false,
          error: null
        });
      }
    } catch (error) {
      console.error("Error loading wishlist:", error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: "Failed to load wishlist"
      }));
    }
  }, [isAuthenticated, user, authLoading]);

  // Handle auth state changes
  useEffect(() => {
    loadWishlist();
  }, [isAuthenticated, user, loadWishlist]);

  // Add item
  const addItem = useCallback(async (productId: string) => {
    if (!isAuthenticated || !user) {
      setState(prev => ({
        ...prev,
        error: "Please sign in to add items to wishlist"
      }));
      return;
    }

    // Optimistic update
    setState(prev => {
      if (prev.productIds.includes(productId)) {
        return prev;
      }
      return {
        ...prev,
        productIds: [...prev.productIds, productId],
        error: null
      };
    });

    try {
      await addToFirestoreWishlist(user.id, productId);
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      // Rollback
      setState(prev => ({
        ...prev,
        productIds: prev.productIds.filter(id => id !== productId),
        error: "Failed to add to wishlist"
      }));
    }
  }, [isAuthenticated, user]);

  // Remove item
  const removeItem = useCallback(async (productId: string) => {
    if (!isAuthenticated || !user) {
      return;
    }

    // Optimistic update
    setState(prev => ({
      ...prev,
      productIds: prev.productIds.filter(id => id !== productId),
      error: null
    }));

    try {
      await removeFromFirestoreWishlist(user.id, productId);
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      setState(prev => ({
        ...prev,
        error: "Failed to remove from wishlist"
      }));
      // Reload to get correct state
      loadWishlist();
    }
  }, [isAuthenticated, user, loadWishlist]);

  // Toggle item
  const toggleItem = useCallback(async (productId: string) => {
    if (!isAuthenticated || !user) {
      setState(prev => ({
        ...prev,
        error: "Please sign in to manage wishlist"
      }));
      return;
    }

    const isCurrentlyInWishlist = state.productIds.includes(productId);

    // Optimistic update
    setState(prev => ({
      ...prev,
      productIds: isCurrentlyInWishlist
        ? prev.productIds.filter(id => id !== productId)
        : [...prev.productIds, productId],
      error: null
    }));

    try {
      await toggleFirestoreWishlist(user.id, productId);
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      // Rollback
      setState(prev => ({
        ...prev,
        productIds: isCurrentlyInWishlist
          ? [...prev.productIds, productId]
          : prev.productIds.filter(id => id !== productId),
        error: "Failed to update wishlist"
      }));
    }
  }, [isAuthenticated, user, state.productIds]);

  // Check if product is in wishlist
  const isInWishlist = useCallback((productId: string): boolean => {
    return state.productIds.includes(productId);
  }, [state.productIds]);

  // Refresh wishlist from storage
  const refreshWishlist = useCallback(async () => {
    await loadWishlist();
  }, [loadWishlist]);

  return {
    ...state,
    addItem,
    removeItem,
    toggleItem,
    isInWishlist,
    refreshWishlist
  };
}

// Helper hook to get wishlist count
export function useWishlistCount() {
  const { productIds, loading } = useWishlist();
  return { count: productIds.length, loading };
}