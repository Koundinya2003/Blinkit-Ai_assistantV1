"use client";

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { Wishlist } from "./types";

const WISHLIST_COLLECTION = "wishlists";

export async function getWishlist(userId: string): Promise<Wishlist | null> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const wishlistRef = doc(db, WISHLIST_COLLECTION, userId);
  const wishlistSnap = await getDoc(wishlistRef);

  if (!wishlistSnap.exists()) return null;

  const data = wishlistSnap.data();
  return {
    id: wishlistSnap.id,
    userId: data.userId,
    productIds: data.productIds || [],
    updatedAt: data.updatedAt?.toDate() || new Date()
  };
}

export async function createWishlist(userId: string, productIds: string[] = []): Promise<Wishlist> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const wishlistRef = doc(db, WISHLIST_COLLECTION, userId);
  const now = new Date();

  const wishlist: Wishlist = {
    id: userId,
    userId,
    productIds,
    updatedAt: now
  };

  await setDoc(wishlistRef, {
    userId,
    productIds,
    updatedAt: serverTimestamp()
  });

  return wishlist;
}

export async function addToWishlist(userId: string, productId: string): Promise<Wishlist> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const wishlistRef = doc(db, WISHLIST_COLLECTION, userId);
  const wishlistSnap = await getDoc(wishlistRef);

  let productIds: string[] = [];

  if (wishlistSnap.exists()) {
    productIds = wishlistSnap.data().productIds || [];
    
    // Prevent duplicates
    if (productIds.includes(productId)) {
      return {
        id: userId,
        userId,
        productIds,
        updatedAt: wishlistSnap.data().updatedAt?.toDate() || new Date()
      };
    }
  }

  productIds.push(productId);

  await setDoc(wishlistRef, {
    userId,
    productIds,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return {
    id: userId,
    userId,
    productIds,
    updatedAt: new Date()
  };
}

export async function removeFromWishlist(userId: string, productId: string): Promise<Wishlist> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const wishlistRef = doc(db, WISHLIST_COLLECTION, userId);
  const wishlistSnap = await getDoc(wishlistRef);

  if (!wishlistSnap.exists()) {
    return {
      id: userId,
      userId,
      productIds: [],
      updatedAt: new Date()
    };
  }

  const productIds = (wishlistSnap.data().productIds || []).filter(
    (id: string) => id !== productId
  );

  await setDoc(wishlistRef, {
    userId,
    productIds,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return {
    id: userId,
    userId,
    productIds,
    updatedAt: new Date()
  };
}

export async function toggleWishlist(userId: string, productId: string): Promise<Wishlist> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const wishlistRef = doc(db, WISHLIST_COLLECTION, userId);
  const wishlistSnap = await getDoc(wishlistRef);

  let productIds: string[] = [];

  if (wishlistSnap.exists()) {
    productIds = wishlistSnap.data().productIds || [];
  }

  const isInWishlist = productIds.includes(productId);

  if (isInWishlist) {
    productIds = productIds.filter((id: string) => id !== productId);
  } else {
    productIds.push(productId);
  }

  await setDoc(wishlistRef, {
    userId,
    productIds,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return {
    id: userId,
    userId,
    productIds,
    updatedAt: new Date()
  };
}

export async function isInWishlist(userId: string, productId: string): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const wishlistRef = doc(db, WISHLIST_COLLECTION, userId);
  const wishlistSnap = await getDoc(wishlistRef);

  if (!wishlistSnap.exists()) return false;

  const productIds = wishlistSnap.data().productIds || [];
  return productIds.includes(productId);
}

export async function deleteWishlist(userId: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const wishlistRef = doc(db, WISHLIST_COLLECTION, userId);
  await deleteDoc(wishlistRef);
}