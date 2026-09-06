"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChefHat,
  Loader2,
  ShoppingBasket,
  Sparkles,
  Timer,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IntentBar, INTENT_EXAMPLES } from "@/components/shop/intent-bar";
import { formatCurrency } from "@/lib/format";
import { formatAmount } from "@/lib/catalog";
import type { BasketPlan } from "@/lib/ai/types";
import { useCartStore } from "@/lib/store/cart-store";
import { cn } from "@/lib/utils";
import { PlanLine } from "./plan-line";

type FetchState = "idle" | "loading" | "ready" | "error";

export function PlanView({ query }: { query: string }) {
  const router = useRouter();
  const [plan, setPlan] = useState<BasketPlan | null>(null);
  const [state, setState] = useState<FetchState>(query ? "loading" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<string[]>([]);

  const addMany = useCartStore((store) => store.addMany);

  // A new sentence starts a fresh plan; edits to this one are kept.
  useEffect(() => {
    setOverrides({});
    setRemoved([]);
  }, [query]);

  const load = useCallback(
    async (nextOverrides: Record<string, string>, nextRemoved: string[]) => {
      if (!query) {
        setState("idle");
        return;
      }
      setState("loading");
      setError(null);
      try {
        const response = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, overrides: nextOverrides, removed: nextRemoved }),
        });
        if (!response.ok) throw new Error("Could not build that basket");
        setPlan((await response.json()) as BasketPlan);
        setState("ready");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Something went wrong");
        setState("error");
      }
    },
    [query]
  );

  useEffect(() => {
    void load(overrides, removed);
    // Reload only when the sentence or the shopper's edits change.
  }, [load, overrides, removed]);

  const cartEntries = useMemo(
    () =>
      (plan?.lines ?? [])
        .filter((line) => line.product)
        .map((line) => ({ productId: line.product!.id, quantity: line.packs })),
    [plan]
  );

  if (!query) return <PlanEmptyState />;
  if (state === "error") {
    return (
      <div className="surface-card p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-danger" aria-hidden />
        <p className="mt-3 font-bold">{error}</p>
        <Button className="mt-4" onClick={() => void load(overrides, removed)}>
          Try again
        </Button>
      </div>
    );
  }
  if (!plan) return <PlanSkeleton query={query} />;

  const missing = plan.lines.filter((line) => !line.product).length;
  const addable = cartEntries.length;

  return (
    <div className={cn("space-y-4", state === "loading" && "opacity-60 transition-opacity")}>
      <section className="surface-card overflow-hidden">
        <div className="border-b border-border bg-gradient-to-r from-primary/10 via-brand/10 to-transparent p-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {plan.planner === "llm" ? "AI plan" : "Blinkit plan"}
            {state === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          </p>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight">{plan.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{plan.summary}</p>

          <dl className="mt-4 flex flex-wrap gap-2">
            <Fact icon={<Users className="h-3.5 w-3.5" />} label="Serves" value={String(plan.intent.people)} />
            {plan.budget && (
              <Fact icon={<Wallet className="h-3.5 w-3.5" />} label="Budget" value={formatCurrency(plan.budget)} />
            )}
            {plan.intent.diet && (
              <Fact
                icon={<ChefHat className="h-3.5 w-3.5" />}
                label="Diet"
                value={plan.intent.diet === "nonveg" ? "Non-veg" : plan.intent.diet === "egg" ? "Eggetarian" : "Vegetarian"}
              />
            )}
            {plan.dishes.length > 0 && (
              <Fact
                icon={<Timer className="h-3.5 w-3.5" />}
                label="Cook time"
                value={`~${Math.max(...plan.dishes.map((dish) => dish.minutes))} min`}
              />
            )}
            {plan.intent.notes.map((note) => (
              <Fact key={note} icon={<Sparkles className="h-3.5 w-3.5" />} label="Noted" value={note} />
            ))}
          </dl>
        </div>

        {plan.dishes.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">On the menu</span>
            {plan.dishes.map((dish) => (
              <span key={dish.id} className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                {dish.name}
              </span>
            ))}
          </div>
        )}

        {plan.notes.length > 0 && (
          <ul className="space-y-1.5 border-b border-border bg-brand/5 px-5 py-3">
            {plan.notes.map((note) => (
              <li key={note} className="flex gap-2 text-xs text-brand-ink">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="divide-y divide-border">
          {plan.lines.map((line) => (
            <PlanLine
              key={line.id}
              line={line}
              requiredLabel={formatAmount(line.requirement.quantity, line.requirement.unit)}
              onSwap={(productId) => setOverrides((current) => ({ ...current, [line.id]: productId }))}
              onRemove={() => setRemoved((current) => [...current, line.id])}
            />
          ))}
        </div>
      </section>

      <section className="surface-card sticky bottom-4 z-10 p-4 shadow-pop">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-baseline gap-2">
              <span className="text-2xl font-black tabular-nums">{formatCurrency(plan.subtotal)}</span>
              <span className="text-xs text-muted-foreground">
                {plan.lines.length} ingredient{plan.lines.length === 1 ? "" : "s"}
                {missing > 0 && ` · ${missing} unavailable`}
              </span>
            </p>
            <BudgetLine plan={plan} />
          </div>

          <div className="flex flex-wrap gap-2">
            {removed.length > 0 && (
              <Button variant="outline" onClick={() => setRemoved([])}>
                Restore {removed.length} removed
              </Button>
            )}
            <Button
              size="lg"
              disabled={addable === 0}
              onClick={() => {
                addMany(cartEntries);
                router.refresh();
              }}
            >
              <ShoppingBasket className="h-4 w-4" aria-hidden />
              Add all {addable} to cart
            </Button>
          </div>
        </div>
      </section>

      <div className="surface-card p-4">
        <p className="text-sm font-semibold">Change the plan</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ask for a different head count, budget or dish and the whole basket is rebuilt.
        </p>
        <IntentBar variant="compact" className="mt-3" />
      </div>
    </div>
  );
}

function BudgetLine({ plan }: { plan: BasketPlan }) {
  if (!plan.budget) {
    return plan.savings > 0 ? (
      <p className="text-xs font-semibold text-primary">You save {formatCurrency(plan.savings)} vs MRP</p>
    ) : null;
  }

  const over = plan.subtotal > plan.budget;
  const delta = Math.abs(plan.subtotal - plan.budget);

  return (
    <p className={cn("text-xs font-semibold", over ? "text-danger" : "text-primary")}>
      {formatCurrency(delta)} {over ? "over" : "under"} your {formatCurrency(plan.budget)} budget
    </p>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1">
      <span className="text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <dt className="sr-only">{label}</dt>
      <dd className="text-xs font-semibold">{value}</dd>
    </div>
  );
}

function PlanSkeleton({ query }: { query: string }) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="border-b border-border p-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Working out what &ldquo;{query}&rdquo; needs
        </p>
        <Skeleton className="mt-3 h-7 w-64" />
        <Skeleton className="mt-2 h-4 w-full max-w-md" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-3.5">
            <Skeleton className="h-14 w-14 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanEmptyState() {
  return (
    <div className="surface-card p-6 sm:p-10">
      <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Tell us what you want to accomplish</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Describe the meal, the head count and the budget. Blinkit works out the dishes, the quantities and the
        exact packs to buy — then puts them in your cart.
      </p>
      <IntentBar className="mt-6" autoFocus />

      <ol className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          ["Say it plainly", "“Biryani for 2” or “dinner for 4 under ₹600”."],
          ["We plan the meal", "Dishes chosen to fit the head count and budget."],
          ["We do the maths", "Ingredient quantities become real pack counts."],
          ["You review and buy", "Swap, remove, then add the lot to your cart."],
        ].map(([title, body], index) => (
          <li key={title} className="rounded-lg bg-muted/60 p-4">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {index + 1}
            </span>
            <p className="mt-2.5 text-sm font-bold">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-8">
        <p className="text-sm font-semibold">Try one of these</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {INTENT_EXAMPLES.map((example) => (
            <a
              key={example}
              href={`/plan?q=${encodeURIComponent(example)}`}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
            >
              {example}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
