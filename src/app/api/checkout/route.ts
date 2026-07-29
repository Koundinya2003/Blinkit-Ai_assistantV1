import { NextResponse } from "next/server";
import { z } from "zod";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { buildOrderItemsFromCart, calculateOrderPricing } from "@/lib/firebase-orders";

const checkoutSchema = z.object({
  userId: z.string().min(1),
  addressId: z.string().min(1),
  deliveryAddress: z.object({
    id: z.string(),
    label: z.string(),
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    pincode: z.string(),
    phone: z.string(),
    isDefault: z.boolean()
  }),
  paymentMode: z.enum(["upi", "card", "cod"]),
  cart: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid checkout payload" }, { status: 400 });
    }

    const { userId, deliveryAddress, paymentMode, cart } = parsed.data;

    // Calculate pricing
    const pricing = calculateOrderPricing(cart);
    
    // Build order items
    const items = buildOrderItemsFromCart(cart);

    const fallbackOrderId = `BLK-AI-${Math.floor(100000 + Math.random() * 900000)}`;
    const db = getDb();

    if (!db) {
      return NextResponse.json({
        orderId: fallbackOrderId,
        mode: "demo",
        pricing
      });
    }

    const orderRef = await addDoc(collection(db, "orders"), {
      userId,
      addressId: parsed.data.addressId,
      items,
      pricing,
      deliveryAddress,
      paymentMethod: paymentMode,
      status: "placed",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return NextResponse.json({
      orderId: orderRef.id,
      mode: "firebase",
      pricing
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to place order. Please try again." },
      { status: 500 }
    );
  }
}