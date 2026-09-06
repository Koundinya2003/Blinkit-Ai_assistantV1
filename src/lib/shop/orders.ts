"use client";

import type { CartTotals } from "./pricing";

export type OrderStatus = "placed" | "packed" | "on_the_way" | "delivered";

export type OrderItem = {
  productId: string;
  name: string;
  brand: string;
  pack: string;
  quantity: number;
  unitPrice: number;
};

export type DeliveryAddress = {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  pincode: string;
  label: string;
};

export type Order = {
  id: string;
  placedAt: string;
  etaMinutes: number;
  items: OrderItem[];
  totals: CartTotals;
  address: DeliveryAddress;
  paymentMethod: "upi" | "card" | "cod";
  /** Set when the order came out of an AI plan, for the order timeline. */
  planTitle?: string;
};

const ORDERS_KEY = "blinkit-orders";
const ADDRESS_KEY = "blinkit-address";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked — the order still completes for this session.
  }
}

export function listOrders(): Order[] {
  return read<Order[]>(ORDERS_KEY, []);
}

export function getOrder(id: string): Order | null {
  return listOrders().find((order) => order.id === id) ?? null;
}

export function saveOrder(order: Order): void {
  write(ORDERS_KEY, [order, ...listOrders()].slice(0, 25));
}

export function newOrderId(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const noise = Math.floor(Math.random() * 900 + 100);
  return `BLK${stamp}${noise}`;
}

export function loadAddress(): DeliveryAddress | null {
  return read<DeliveryAddress | null>(ADDRESS_KEY, null);
}

export function saveAddress(address: DeliveryAddress): void {
  write(ADDRESS_KEY, address);
}

/** Orders move through the timeline on a clock, the way a real one would. */
export function statusFor(order: Order): { status: OrderStatus; minutesElapsed: number } {
  const minutesElapsed = Math.max(0, (Date.now() - new Date(order.placedAt).getTime()) / 60000);
  const eta = order.etaMinutes;
  if (minutesElapsed >= eta) return { status: "delivered", minutesElapsed };
  if (minutesElapsed >= eta * 0.55) return { status: "on_the_way", minutesElapsed };
  if (minutesElapsed >= eta * 0.2) return { status: "packed", minutesElapsed };
  return { status: "placed", minutesElapsed };
}

export const STATUS_STEPS: { status: OrderStatus; label: string; detail: string }[] = [
  { status: "placed", label: "Order placed", detail: "We have your order" },
  { status: "packed", label: "Packed", detail: "Picked from the dark store" },
  { status: "on_the_way", label: "On the way", detail: "Your rider is riding out" },
  { status: "delivered", label: "Delivered", detail: "Enjoy your order" },
];
