"use client";

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { UserAddress } from "./types";

const USERS_COLLECTION = "users";

export async function getUserAddresses(userId: string): Promise<UserAddress[]> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return [];
  }

  const data = userSnap.data();
  return data.addresses || [];
}

export async function addUserAddress(
  userId: string,
  address: Omit<UserAddress, "id">
): Promise<UserAddress> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("User not found");
  }

  const userData = userSnap.data();
  const addresses: UserAddress[] = userData.addresses || [];
  
  // If this is the first address or marked as default, set it as default
  const isDefault = address.isDefault || addresses.length === 0;
  
  // If setting as default, unset other defaults
  if (isDefault) {
    for (let i = 0; i < addresses.length; i++) {
      addresses[i] = { ...addresses[i], isDefault: false };
    }
  }

  const newAddress: UserAddress = {
    ...address,
    id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    isDefault
  };

  addresses.push(newAddress);

  await updateDoc(userRef, {
    addresses,
    defaultAddressId: isDefault ? newAddress.id : userData.defaultAddressId,
    updatedAt: serverTimestamp()
  });

  return newAddress;
}

export async function updateUserAddress(
  userId: string,
  addressId: string,
  updates: Partial<Omit<UserAddress, "id">>
): Promise<UserAddress> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("User not found");
  }

  const userData = userSnap.data();
  const addresses: UserAddress[] = userData.addresses || [];
  
  const addressIndex = addresses.findIndex(addr => addr.id === addressId);
  if (addressIndex === -1) {
    throw new Error("Address not found");
  }

  // If setting as default, unset other defaults
  if (updates.isDefault) {
    for (let i = 0; i < addresses.length; i++) {
      if (i !== addressIndex) {
        addresses[i] = { ...addresses[i], isDefault: false };
      }
    }
  }

  addresses[addressIndex] = {
    ...addresses[addressIndex],
    ...updates,
    id: addressId // Ensure id cannot be changed
  };

  await updateDoc(userRef, {
    addresses,
    defaultAddressId: updates.isDefault ? addressId : userData.defaultAddressId,
    updatedAt: serverTimestamp()
  });

  return addresses[addressIndex];
}

export async function deleteUserAddress(
  userId: string,
  addressId: string
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("User not found");
  }

  const userData = userSnap.data();
  const addresses: UserAddress[] = userData.addresses || [];
  
  const addressToDelete = addresses.find(addr => addr.id === addressId);
  if (!addressToDelete) {
    throw new Error("Address not found");
  }

  const filteredAddresses = addresses.filter(addr => addr.id !== addressId);

  // If deleted address was default, set the first remaining address as default
  let defaultAddressId = userData.defaultAddressId;
  if (addressToDelete.isDefault && filteredAddresses.length > 0) {
    filteredAddresses[0] = { ...filteredAddresses[0], isDefault: true };
    defaultAddressId = filteredAddresses[0].id;
  } else if (filteredAddresses.length === 0) {
    defaultAddressId = null;
  }

  await updateDoc(userRef, {
    addresses: filteredAddresses,
    defaultAddressId,
    updatedAt: serverTimestamp()
  });
}

export async function setDefaultAddress(
  userId: string,
  addressId: string
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("User not found");
  }

  const userData = userSnap.data();
  const addresses: UserAddress[] = userData.addresses || [];
  
  // Unset all defaults
  for (let i = 0; i < addresses.length; i++) {
    addresses[i] = { ...addresses[i], isDefault: addresses[i].id === addressId };
  }

  await updateDoc(userRef, {
    addresses,
    defaultAddressId: addressId,
    updatedAt: serverTimestamp()
  });
}

export async function getDefaultAddress(userId: string): Promise<UserAddress | null> {
  const addresses = await getUserAddresses(userId);
  return addresses.find(addr => addr.isDefault) || addresses[0] || null;
}