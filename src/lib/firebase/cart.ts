"use client";

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { getDb } from "./index";
import type { Cart, CartItem } from "../types";

const CART_COLLECTION = "carts";

export async function getCart(userId: string): Promise<Cart | null> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const cartRef = doc(db, CART_COLLECTION, userId);
  const cartSnap = await getDoc(cartRef);

  if (!cartSnap.exists()) return null;

  const data = cartSnap.data();
  return {
    id: cartSnap.id,
    userId: data.userId,
    items: data.items || [],
    updatedAt: data.updatedAt?.toDate() || new Date()
  };
}

export async function createCart(userId: string, items: CartItem[] = []): Promise<Cart> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const cartRef = doc(db, CART_COLLECTION, userId);
  const now = new Date();
  
  const cart: Cart = {
    id: userId,
    userId,
    items,
    updatedAt: now
  };

  await setDoc(cartRef, {
    userId,
    items,
    updatedAt: serverTimestamp()
  });

  return cart;
}

export async function updateCart(userId: string, items: CartItem[]): Promise<Cart> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const cartRef = doc(db, CART_COLLECTION, userId);
  const now = new Date();

  await setDoc(cartRef, {
    userId,
    items,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return {
    id: userId,
    userId,
    items,
    updatedAt: now
  };
}

export async function addToCart(userId: string, productId: string, quantity: number = 1, priceAtAdd: number): Promise<Cart> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const cartRef = doc(db, CART_COLLECTION, userId);
  const cartSnap = await getDoc(cartRef);
  
  let items: CartItem[] = [];
  
  if (cartSnap.exists()) {
    items = cartSnap.data().items || [];
  }

  const existingIndex = items.findIndex(item => item.productId === productId);
  
  if (existingIndex >= 0) {
    items[existingIndex] = {
      ...items[existingIndex],
      quantity: items[existingIndex].quantity + quantity
    };
  } else {
    items.push({
      productId,
      quantity,
      priceAtAdd,
      addedAt: new Date()
    });
  }

  await setDoc(cartRef, {
    userId,
    items,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return {
    id: userId,
    userId,
    items,
    updatedAt: new Date()
  };
}

export async function removeFromCart(userId: string, productId: string): Promise<Cart> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const cartRef = doc(db, CART_COLLECTION, userId);
  const cartSnap = await getDoc(cartRef);
  
  if (!cartSnap.exists()) {
    return {
      id: userId,
      userId,
      items: [],
      updatedAt: new Date()
    };
  }

  const items = (cartSnap.data().items || []).filter(
    (item: CartItem) => item.productId !== productId
  );

  await setDoc(cartRef, {
    userId,
    items,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return {
    id: userId,
    userId,
    items,
    updatedAt: new Date()
  };
}

export async function updateCartItemQuantity(
  userId: string,
  productId: string,
  quantity: number
): Promise<Cart> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const cartRef = doc(db, CART_COLLECTION, userId);
  const cartSnap = await getDoc(cartRef);
  
  if (!cartSnap.exists()) {
    return {
      id: userId,
      userId,
      items: [],
      updatedAt: new Date()
    };
  }

  let items = cartSnap.data().items || [];

  if (quantity <= 0) {
    items = items.filter((item: CartItem) => item.productId !== productId);
  } else {
    items = items.map((item: CartItem) =>
      item.productId === productId ? { ...item, quantity } : item
    );
  }

  await setDoc(cartRef, {
    userId,
    items,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return {
    id: userId,
    userId,
    items,
    updatedAt: new Date()
  };
}

export async function clearCart(userId: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const cartRef = doc(db, CART_COLLECTION, userId);
  await setDoc(cartRef, {
    userId,
    items: [],
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function deleteCart(userId: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const cartRef = doc(db, CART_COLLECTION, userId);
  await deleteDoc(cartRef);
}