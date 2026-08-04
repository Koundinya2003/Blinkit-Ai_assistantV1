"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, MapPin, Package, RefreshCw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/firebase/auth";
import { getUserOrders } from "@/lib/firebase/orders";
import { useCartStore } from "@/store/cart-store";
import { formatCurrency } from "@/lib/utils";
import { getProductImage } from "@/lib/product-image";
import type { Order } from "@/lib/types";

const statusConfig = {
  placed: { label: "Order placed", color: "text-blue-600", bg: "bg-blue-50", icon: Package },
  confirmed: { label: "Confirmed", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
  packed: { label: "Packed", color: "text-purple-600", bg: "bg-purple-50", icon: Package },
  out_for_delivery: { label: "Out for delivery", color: "text-orange-600", bg: "bg-orange-50", icon: Clock },
  delivered: { label: "Delivered", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50", icon: Package }
};

function OrdersContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const { user, isAuthenticated } = useAuth();
  const { addItem, clearCart } = useCartStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState<string | null>(null);

  const handleReorder = useCallback(async (order: Order) => {
    if (!user) return;

    try {
      setReordering(order.id);

      // Clear current cart
      await clearCart();

      // Add all items from the order to cart
      for (const item of order.items) {
        await addItem(item.productId, item.quantity);
      }

      // Navigate to checkout
      window.location.href = "/checkout";
    } catch (error) {
      console.error("Error reordering:", error);
      setReordering(null);
    }
  }, [user, clearCart, addItem]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userOrders = await getUserOrders(user.id);
      setOrders(userOrders);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <section className="rounded-lg bg-white p-6 text-center shadow-soft">
          <Package className="mx-auto h-14 w-14 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-black">Sign in to view orders</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please sign in to see your order history
          </p>
          <Link href="/">
            <Button className="mt-6">Continue shopping</Button>
          </Link>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </main>
    );
  }

  // Show order confirmation if orderId is in URL
  if (orderId) {
    const confirmedOrder = orders.find(o => o.id === orderId);
    
    if (confirmedOrder) {
      const status = statusConfig[confirmedOrder.status] || statusConfig.placed;

      return (
        <main className="mx-auto max-w-3xl px-4 py-12">
          <section className="rounded-lg bg-white p-6 shadow-soft">
            <div className="flex items-center justify-center">
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </div>
            <h1 className="mt-4 text-center text-3xl font-black">Order confirmed!</h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Order {confirmedOrder.id} has been placed successfully
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className={`rounded-lg p-4 ${status.bg}`}>
                <div className="flex items-center gap-2">
                  <status.icon className={`h-5 w-5 ${status.color}`} />
                  <p className={`font-black ${status.color}`}>{status.label}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your order is being processed
                </p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <p className="font-black">Estimated delivery</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {confirmedOrder.createdAt.toLocaleString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="font-black">Delivery address</h3>
              </div>
              <div className="mt-3">
                <p className="text-sm font-bold">{confirmedOrder.deliveryAddress.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {confirmedOrder.deliveryAddress.line1}
                  {confirmedOrder.deliveryAddress.line2 && `, ${confirmedOrder.deliveryAddress.line2}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {confirmedOrder.deliveryAddress.city}, {confirmedOrder.deliveryAddress.state} - {confirmedOrder.deliveryAddress.pincode}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-border p-4">
              <h3 className="font-black">Order items ({confirmedOrder.items.length})</h3>
              <div className="mt-4 space-y-3">
                {confirmedOrder.items.slice(0, 3).map((item) => (
                  <div key={item.productId} className="flex items-center gap-3">
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      <Image
                        src={item.productImage || getProductImage(item.productId)}
                        alt={item.productName}
                        fill
                        sizes="48px"
                        className="object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-black">{formatCurrency(item.totalPrice)}</p>
                  </div>
                ))}
                {confirmedOrder.items.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{confirmedOrder.items.length - 3} more items
                  </p>
                )}
              </div>

              <div className="mt-4 flex justify-between border-t border-border pt-3 text-base font-black">
                <span>Total</span>
                <span>{formatCurrency(confirmedOrder.pricing.total)}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/orders" className="flex-1">
                <Button variant="secondary" className="w-full">
                  View all orders
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button className="w-full justify-between">
                  Continue shopping
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </section>
        </main>
      );
    }
  }

  // Show orders list
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6">
        <h1 className="text-3xl font-black">My orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {orders.length} {orders.length === 1 ? "order" : "orders"} total
        </p>
      </div>

      {orders.length === 0 ? (
        <section className="rounded-lg bg-white p-6 text-center shadow-soft">
          <Package className="mx-auto h-14 w-14 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-black">No orders yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start shopping to see your orders here
          </p>
          <Link href="/">
            <Button className="mt-6">Start shopping</Button>
          </Link>
        </section>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.placed;
            const StatusIcon = status.icon;

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black">Order {order.id.slice(0, 8)}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {order.createdAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{order.deliveryAddress.city}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black">{formatCurrency(order.pricing.total)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-4 w-4 ${status.color}`} />
                    <span className="text-xs font-bold text-muted-foreground">
                      {order.items.length} {order.items.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      handleReorder(order);
                    }}
                    disabled={reordering === order.id}
                  >
                    <RefreshCw className={`h-4 w-4 ${reordering === order.id ? "animate-spin" : ""}`} />
                    <span className="ml-1">Reorder</span>
                  </Button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

function OrdersLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </main>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersLoading />}>
      <OrdersContent />
    </Suspense>
  );
}