import { Suspense } from "react";
import type { Metadata } from "next";
import { PlanView } from "@/components/plan/plan-view";

export const metadata: Metadata = {
  title: "Build a basket",
  description: "Describe what you want to cook and Blinkit turns it into a shoppable basket.",
};

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  return (
    <Suspense fallback={null}>
      <PlanView key={query} query={query} />
    </Suspense>
  );
}
