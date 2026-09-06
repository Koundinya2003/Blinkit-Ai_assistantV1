"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Clock, MapPin, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { getOrder, statusFor, STATUS_STEPS, type Order } from "@/lib/shop/orders";
import { cn } from "@/lib/utils";

export function OrderView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setOrder(getOrder(orderId));
    setLoaded(true);
  }, [orderId]);

  // Re-render on a timer so the delivery timeline advances on screen.
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 15_000);
    return () => clearInterval(timer);
  }, []);

  if (!loaded) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <EmptyState
        emoji="📦"
        title="We can't find that order"
        description="Orders are stored on this device, so it may have been placed elsewhere."
        action={
          <Link href="/">
            <Button>Back to shopping</Button>
          </Link>
        }
      />
    );
  }

  const { status, minutesElapsed } = statusFor(order);
  const currentIndex = STATUS_STEPS.findIndex((step) => step.status === status);
  const minutesLeft = Math.max(0, Math.ceil(order.etaMinutes - minutesElapsed));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="surface-card overflow-hidden">
        <div className="bg-gradient-to-r from-primary/15 to-brand/15 p-6 text-center">
          <PartyPopper className="mx-auto h-9 w-9 text-primary" aria-hidden />
          <h1 className="mt-3 text-xl font-black">
            {status === "delivered" ? "Delivered" : "Order confirmed"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === "delivered"
              ? "Hope everything arrived just right."
              : `Arriving in about ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}`}
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs font-bold">
            <Clock className="h-3.5 w-3.5 text-primary" aria-hidden />
            Order {order.id}
          </p>
        </div>

        <ol className="divide-y divide-border">
          {STATUS_STEPS.map((step, index) => {
            const done = index <= currentIndex;
            return (
              <li key={step.status} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold",
                    done ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                  )}
                  aria-hidden
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <div>
                  <p className={cn("text-sm font-semibold", !done && "text-muted-foreground")}>{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="surface-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <MapPin className="h-4 w-4 text-primary" aria-hidden />
          Delivering to {order.address.label}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {order.address.name} · {order.address.phone}
          <br />
          {order.address.line1}, {order.address.line2}
          <br />
          {order.address.city} {order.address.pincode}
        </p>
      </section>

      <section className="surface-card p-5">
        <h2 className="text-sm font-bold">{order.items.length} items</h2>
        <ul className="mt-3 divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.productId} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground">
                  {item.quantity} × {item.pack}
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {formatCurrency(item.unitPrice * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Items total</dt>
            <dd className="tabular-nums">{formatCurrency(order.totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Delivery + handling</dt>
            <dd className="tabular-nums">{formatCurrency(order.totals.delivery + order.totals.handling)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-bold">
            <dt>Paid via {order.paymentMethod.toUpperCase()}</dt>
            <dd className="tabular-nums">{formatCurrency(order.totals.total)}</dd>
          </div>
        </dl>
      </section>

      <div className="flex gap-2">
        <Link href="/" className="flex-1">
          <Button variant="outline" className="w-full">
            Back to home
          </Button>
        </Link>
        <Link href="/plan" className="flex-1">
          <Button className="w-full">Plan another meal</Button>
        </Link>
      </div>
    </div>
  );
}
