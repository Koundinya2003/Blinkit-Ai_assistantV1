import { NextResponse } from "next/server";
import { z } from "zod";
import { askOpenRouter, getBasketInsights, getBasketRecommendations } from "@/lib/ai";

const cartLineSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive()
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = z.object({ cart: z.array(cartLineSchema) }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid basket" }, { status: 400 });
  }

  const openRouter = await askOpenRouter(parsed.data.cart).catch(() => null);
  const assistantNote = openRouter?.choices?.[0]?.message?.content as string | undefined;

  return NextResponse.json({
    insights: getBasketInsights(parsed.data.cart),
    recommendations: getBasketRecommendations(parsed.data.cart),
    assistantNote
  });
}
