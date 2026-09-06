import type { Metadata } from "next";
import { OrderView } from "@/components/shop/order-view";

export const metadata: Metadata = { title: "Your order" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderView orderId={id} />;
}
