"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const INTENT_EXAMPLES = [
  "Dinner for 4 under ₹600",
  "Biryani for 2",
  "Breakfast for 3 people",
  "Hosting 6 tonight, budget ₹1,500",
  "Paneer butter masala for 4",
  "Movie night snacks under ₹500",
];

/**
 * The front door of the product: a shopper states an outcome, not a keyword.
 */
export function IntentBar({
  variant = "hero",
  autoFocus,
  className,
}: {
  variant?: "hero" | "compact";
  autoFocus?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const query = value.trim();
    if (!query) return;
    router.push(`/plan?q=${encodeURIComponent(query)}`);
  };

  const go = (example: string) => router.push(`/plan?q=${encodeURIComponent(example)}`);

  return (
    <div className={cn("w-full", className)}>
      <form onSubmit={submit} className="relative">
        <Sparkles
          className={cn(
            "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary",
            variant === "hero" ? "h-5 w-5" : "h-4 w-4"
          )}
          aria-hidden
        />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoFocus={autoFocus}
          aria-label="Tell Blinkit what you want to accomplish"
          placeholder={variant === "hero" ? "Tell us what you want to accomplish…" : "Dinner for 4 under ₹600"}
          className={cn(
            "w-full rounded-[14px] border border-border bg-background pl-11 font-medium outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10",
            variant === "hero" ? "h-14 pr-16 text-base sm:pr-40" : "h-11 pr-14 text-sm sm:pr-32"
          )}
        />
        <button
          type="submit"
          disabled={!value.trim()}
          aria-label={variant === "hero" ? "Build basket" : "Rebuild the plan"}
          className={cn(
            "absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center justify-center gap-1.5 rounded-[10px] bg-primary px-3 font-bold text-primary-foreground transition-opacity disabled:opacity-40 sm:px-4",
            variant === "hero" ? "h-11 text-sm" : "h-8 text-xs"
          )}
        >
          {/* The label is dropped on narrow screens so it never crowds the input. */}
          <span className="hidden sm:inline">{variant === "hero" ? "Build basket" : "Rebuild"}</span>
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </form>

      {variant === "hero" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {INTENT_EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => go(example)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
