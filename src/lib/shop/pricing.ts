import type { Product } from "@/lib/catalog";

export const FREE_DELIVERY_ABOVE = 499;
export const DELIVERY_FEE = 25;
export const HANDLING_FEE = 6;

export type CartTotals = {
  itemCount: number;
  subtotal: number;
  mrpTotal: number;
  savings: number;
  handling: number;
  delivery: number;
  total: number;
  amountToFreeDelivery: number;
};

export function computeTotals(entries: { product: Product; quantity: number }[]): CartTotals {
  const subtotal = entries.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);
  const mrpTotal = entries.reduce((sum, entry) => sum + entry.product.mrp * entry.quantity, 0);
  const itemCount = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const handling = subtotal > 0 ? HANDLING_FEE : 0;
  const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;

  return {
    itemCount,
    subtotal,
    mrpTotal,
    savings: Math.max(0, mrpTotal - subtotal),
    handling,
    delivery,
    total: subtotal + handling + delivery,
    amountToFreeDelivery: Math.max(0, FREE_DELIVERY_ABOVE - subtotal),
  };
}
