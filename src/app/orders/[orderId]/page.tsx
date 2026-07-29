import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Clock, MapPin, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrder } from "@/lib/firebase-orders";
import { formatCurrency } from "@/lib/utils";

const statusConfig = {
  placed: { label: "Order placed", color: "text-blue-600", bg: "bg-blue-50" },
  confirmed: { label: "Confirmed", color: "text-green-600", bg: "bg-green-50" },
  packed: { label: "Packed", color: "text-purple-600", bg: "bg-purple-50" },
  out_for_delivery: { label: "Out for delivery", color: "text-orange-600", bg: "bg-orange-50" },
  delivered: { label: "Delivered", color: "text-green-600", bg: "bg-green-50" },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50" }
};

export default async function OrderConfirmationPage({
  params
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getOrder(orderId);

  if (!order) {
    notFound();
  }

  const status = statusConfig[order.status] || statusConfig.placed;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <section className="rounded-lg bg-white p-6 shadow-soft">
        <div className="flex items-center justify-center">
          <CheckCircle2 className="h-16 w-16 text-primary" />
        </div>
        <h1 className="mt-4 text-center text-3xl font-black">Order confirmed!</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Order {order.id} has been placed successfully
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className={`rounded-lg p-4 ${status.bg}`}>
            <div className="flex items-center gap-2">
              <Package className={`h-5 w-5 ${status.color}`} />
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
              {order.createdAt.toLocaleString("en-IN", {
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
            <p className="text-sm font-bold">{order.deliveryAddress.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {order.deliveryAddress.line1}
              {order.deliveryAddress.line2 && `, ${order.deliveryAddress.line2}`}
            </p>
            <p className="text-sm text-muted-foreground">
              {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}
            </p>
            <p className="text-sm text-muted-foreground">Phone: {order.deliveryAddress.phone}</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-border p-4">
          <h3 className="font-black">Order items</h3>
          <div className="mt-4 space-y-3">
            {order.items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={item.productImage}
                      alt={item.productName}
                      fill
                      sizes="64px"
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
          </div>

          <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(order.pricing.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{order.pricing.deliveryFee ? formatCurrency(order.pricing.deliveryFee) : "FREE"}</span>
            </div>
            <div className="flex justify-between">
              <span>Handling</span>
              <span>{formatCurrency(order.pricing.tax)}</span>
            </div>
            {order.pricing.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(order.pricing.discount)}</span>
              </div>
            )}
            <div className="border-t border-border pt-2 font-black flex justify-between text-base">
              <span>Total</span>
              <span>{formatCurrency(order.pricing.total)}</span>
            </div>
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
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}