"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Clock, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { productArt } from "@/lib/product-image";
import { useCartEntries, useCartStore, useCartTotals } from "@/lib/store/cart-store";
import { QuantityStepper } from "./quantity-stepper";

export function CartDrawer() {
  const router = useRouter();
  const isOpen = useCartStore((state) => state.isOpen);
  const close = useCartStore((state) => state.close);
  const entries = useCartEntries();
  const totals = useCartTotals();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-slate-950/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.aside
            role="dialog"
            aria-label="Your cart"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3.5">
              <h2 className="text-base font-bold">My Cart</h2>
              <Button variant="ghost" size="icon" onClick={close} aria-label="Close cart">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {entries.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                <ShoppingBag className="h-12 w-12 text-muted-foreground" aria-hidden />
                <p className="font-bold">Your cart is empty</p>
                <p className="text-sm text-muted-foreground">
                  Tell Blinkit what you want to cook and we&apos;ll fill this for you.
                </p>
                <Button
                  onClick={() => {
                    close();
                    router.push("/plan");
                  }}
                >
                  Build a basket with AI
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  <div className="flex items-center gap-2 rounded-[10px] bg-primary/10 px-3 py-2.5 text-sm">
                    <Clock className="h-4 w-4 text-primary" aria-hidden />
                    <span className="font-semibold">Delivery in 11 minutes</span>
                  </div>

                  <div className="surface-card divide-y divide-border">
                    {entries.map(({ product, quantity }) => (
                      <div key={product.id} className="flex items-center gap-3 p-3">
                        <Link href={`/product/${product.slug}`} onClick={close} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                          <Image src={productArt(product)} alt="" fill sizes="56px" className="object-cover" unoptimized />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.pack}</p>
                          <p className="mt-0.5 text-sm font-bold">{formatCurrency(product.price * quantity)}</p>
                        </div>
                        <QuantityStepper productId={product.id} size="sm" />
                      </div>
                    ))}
                  </div>

                  <div className="surface-card p-4">
                    <h3 className="text-sm font-bold">Bill details</h3>
                    <dl className="mt-3 space-y-2 text-sm">
                      <Row label="Items total" value={formatCurrency(totals.subtotal)} />
                      <Row
                        label="Delivery charge"
                        value={totals.delivery === 0 ? "FREE" : formatCurrency(totals.delivery)}
                        highlight={totals.delivery === 0}
                      />
                      <Row label="Handling charge" value={formatCurrency(totals.handling)} />
                      <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                        <dt>Grand total</dt>
                        <dd>{formatCurrency(totals.total)}</dd>
                      </div>
                    </dl>
                    {totals.savings > 0 && (
                      <p className="mt-3 rounded-md bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
                        You saved {formatCurrency(totals.savings)} on this order
                      </p>
                    )}
                    {totals.amountToFreeDelivery > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Add {formatCurrency(totals.amountToFreeDelivery)} more for free delivery.
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-border bg-background p-4">
                  <Button
                    size="lg"
                    className="w-full justify-between"
                    onClick={() => {
                      close();
                      router.push("/checkout");
                    }}
                  >
                    <span>{formatCurrency(totals.total)} · Proceed to pay</span>
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={highlight ? "font-semibold text-primary" : ""}>{value}</dd>
    </div>
  );
}
