"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProductById } from "@/lib/data-service";
import { getCartTotals } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import { QuantityStepper } from "@/components/shop/quantity-stepper";
import { AiBasketPanel } from "@/components/shop/ai-basket-panel";

export function CartDrawer() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const loading = useCartStore((state) => state.loading);
  const error = useCartStore((state) => state.error);
  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const cart = items.map(item => ({ productId: item.productId, quantity: item.quantity }));
  const totals = getCartTotals(cart);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.button
            aria-label="Close cart overlay"
            className="fixed inset-0 z-50 bg-slate-950/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />
          <motion.aside
            className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col bg-white shadow-soft"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h2 className="text-lg font-black">My Cart</h2>
                <p className="text-xs text-muted-foreground">
                  {error
                    ? "Error loading cart"
                    : cart.length
                      ? "Delivery in 11 minutes"
                      : "Your cart is empty"}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={closeCart}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {error ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <p className="mt-3 font-bold text-red-600">Error loading cart</p>
                    <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                    <Button onClick={closeCart} className="mt-4">Close</Button>
                  </div>
                </div>
              ) : loading ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <p className="font-bold">Loading cart...</p>
                  </div>
                </div>
              ) : cart.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 font-bold">Add groceries to begin</p>
                    <p className="mt-1 text-sm text-muted-foreground">AI recommendations appear as your basket takes shape.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {cart.map((line) => {
                      const product = getProductById(line.productId);
                      if (!product) return null;
                      return (
                        <div key={line.productId} className="flex items-center gap-3 rounded-lg border border-border p-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.brand} · {product.unit}</p>
                            <p className="mt-1 text-sm font-black">{formatCurrency(product.price * line.quantity)}</p>
                          </div>
                          <QuantityStepper productId={product.id} />
                        </div>
                      );
                    })}
                  </div>
                  <AiBasketPanel />
                  <section className="rounded-lg border border-border p-3">
                    <h3 className="text-sm font-black">Bill details</h3>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between"><span>Item total</span><span>{formatCurrency(totals.subtotal)}</span></div>
                      <div className="flex justify-between"><span>Delivery</span><span>{totals.delivery ? formatCurrency(totals.delivery) : "FREE"}</span></div>
                      <div className="flex justify-between"><span>Handling</span><span>{formatCurrency(totals.handling)}</span></div>
                      <div className="flex justify-between"><span>GST</span><span>{formatCurrency(totals.gst)}</span></div>
                      <div className="border-t border-border pt-2 font-black flex justify-between"><span>To pay</span><span>{formatCurrency(totals.total)}</span></div>
                    </div>
                  </section>
                </div>
              )}
            </div>
            {cart.length > 0 && !loading && !error && (
              <div className="border-t border-border p-4">
                <Button 
                  onClick={() => {
                    closeCart();
                    router.push("/checkout");
                  }} 
                  className="w-full justify-between"
                >
                  Proceed to checkout
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}