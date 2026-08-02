"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  serverTimestamp
} from "firebase/firestore";
import { getDb } from "./index";
import type { Order, OrderItem, OrderPricing, UserAddress, PaymentMethod } from "../types";
import { getProductById } from "../data-service";

const ORDERS_COLLECTION = "orders";

export async function createOrder(
  userId: string,
  items: OrderItem[],
  pricing: OrderPricing,
  deliveryAddress: UserAddress,
  paymentMethod: PaymentMethod
): Promise<Order> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const now = new Date();

  const order: Order = {
    id: "", // Will be set after creation
    userId,
    items,
    pricing,
    deliveryAddress,
    paymentMethod,
    status: "placed",
    createdAt: now,
    updatedAt: now,
    deliveredAt: null
  };

  const orderRef = doc(collection(db, ORDERS_COLLECTION));
  
  await setDoc(orderRef, {
    ...order,
    id: orderRef.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return {
    ...order,
    id: orderRef.id
  };
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const orderSnap = await getDoc(orderRef);

  if (!orderSnap.exists()) {
    return null;
  }

  const data = orderSnap.data();
  return {
    id: orderSnap.id,
    userId: data.userId,
    items: data.items,
    pricing: data.pricing,
    deliveryAddress: data.deliveryAddress,
    paymentMethod: data.paymentMethod,
    status: data.status,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    deliveredAt: data.deliveredAt?.toDate() || null
  };
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const ordersRef = collection(db, ORDERS_COLLECTION);
  const q = query(
    ordersRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(q);
  const orders: Order[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    orders.push({
      id: doc.id,
      userId: data.userId,
      items: data.items,
      pricing: data.pricing,
      deliveryAddress: data.deliveryAddress,
      paymentMethod: data.paymentMethod,
      status: data.status,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      deliveredAt: data.deliveredAt?.toDate() || null
    });
  });

  return orders;
}

export async function updateOrderStatus(
  orderId: string,
  status: Order["status"]
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  
  const updates: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp()
  };

  if (status === "delivered") {
    updates.deliveredAt = serverTimestamp();
  }

  await updateDoc(orderRef, updates);
}

export function buildOrderItemsFromCart(
  cartItems: Array<{ productId: string; quantity: number }>
): OrderItem[] {
  return cartItems.map(item => {
    const product = getProductById(item.productId);
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    return {
      productId: item.productId,
      productName: product.name,
      productImage: product.image,
      quantity: item.quantity,
      unitPrice: product.price,
      totalPrice: product.price * item.quantity
    };
  });
}

export function calculateOrderPricing(
  cartItems: Array<{ productId: string; quantity: number }>
): OrderPricing {
  const subtotal = cartItems.reduce((sum, item) => {
    const product = getProductById(item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  const mrpTotal = cartItems.reduce((sum, item) => {
    const product = getProductById(item.productId);
    return sum + (product ? product.mrp * item.quantity : 0);
  }, 0);

  const discount = mrpTotal - subtotal;
  const deliveryFee = subtotal > 499 || subtotal === 0 ? 0 : 25;
  const handling = subtotal > 0 ? 6 : 0;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + deliveryFee + handling + tax;

  return {
    subtotal,
    discount,
    deliveryFee,
    tax,
    total
  };
}

