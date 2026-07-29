import { getProductById } from "@/lib/catalog";
import type { CartLine } from "@/lib/types";

export function getCartTotals(cart: CartLine[]) {
  const subtotal = cart.reduce((sum, line) => {
    const product = getProductById(line.productId);
    return sum + (product ? product.price * line.quantity : 0);
  }, 0);
  const mrpTotal = cart.reduce((sum, line) => {
    const product = getProductById(line.productId);
    return sum + (product ? product.mrp * line.quantity : 0);
  }, 0);
  const handling = subtotal > 0 ? 6 : 0;
  const delivery = subtotal > 499 || subtotal === 0 ? 0 : 25;
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + handling + delivery + gst;

  return {
    subtotal,
    mrpTotal,
    savings: Math.max(0, mrpTotal - subtotal),
    handling,
    delivery,
    gst,
    total
  };
}
