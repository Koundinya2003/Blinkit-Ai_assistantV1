import { NextResponse } from "next/server";
import { z } from "zod";
import { buildBasketPlan } from "@/lib/ai";

export const runtime = "nodejs";

const planSchema = z.object({
  query: z.string().min(2).max(300),
  overrides: z.record(z.string(), z.string()).optional(),
  removed: z.array(z.string()).max(40).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Tell us what you want to cook or shop for." }, { status: 400 });
  }

  try {
    const plan = await buildBasketPlan(parsed.data);
    return NextResponse.json(plan);
  } catch (error) {
    console.error("Failed to build basket plan:", error);
    return NextResponse.json({ error: "We could not build that basket. Try rephrasing it." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q");
  if (!query) return NextResponse.json({ error: "Add a ?q= description" }, { status: 400 });
  return POST(new Request(request.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  }));
}
