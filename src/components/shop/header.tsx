"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, MapPin, Search, ShoppingCart, Sparkles } from "lucide-react";
import { useCartCount, useCartStore } from "@/lib/store/cart-store";
import { formatCurrency } from "@/lib/format";
import { useCartTotals } from "@/lib/store/cart-store";

const LOCATIONS = [
  "Whitefield, Bengaluru 560066",
  "Worli, Mumbai 400018",
  "Greater Kailash II, New Delhi 110048",
  "Gachibowli, Hyderabad 500032",
];

export function Header() {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [locationIndex, setLocationIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const openCart = useCartStore((state) => state.open);
  const count = useCartCount();
  const totals = useCartTotals();

  useEffect(() => setMounted(true), []);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : "/search");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand text-lg font-black text-brand-ink">
            b
          </span>
          <span className="hidden text-lg font-black tracking-tight sm:block">blinkit</span>
        </Link>

        <button
          type="button"
          onClick={() => setLocationIndex((index) => (index + 1) % LOCATIONS.length)}
          className="hidden shrink-0 items-center gap-1.5 rounded-[10px] px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted lg:flex"
        >
          <MapPin className="h-4 w-4 text-primary" aria-hidden />
          <span>
            <span className="block font-bold">Delivery in 11 minutes</span>
            <span className="block max-w-[190px] truncate text-muted-foreground">{LOCATIONS[locationIndex]}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
        </button>

        <form onSubmit={submitSearch} className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search products"
            placeholder='Search "milk", "atta", "paneer"'
            className="h-11 w-full rounded-[10px] border border-border bg-muted/60 pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
          />
        </form>

        <Link
          href="/plan"
          aria-label="Build a basket with AI"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border border-primary/30 bg-primary/5 px-2.5 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary/10 sm:px-3"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">AI Basket</span>
        </Link>

        <button
          type="button"
          onClick={openCart}
          className="inline-flex shrink-0 items-center gap-2 rounded-[10px] bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground"
          aria-label={`Cart, ${count} items`}
        >
          <ShoppingCart className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline tabular-nums">
            {mounted && count > 0 ? `${count} item${count > 1 ? "s" : ""} · ${formatCurrency(totals.subtotal)}` : "My Cart"}
          </span>
          {mounted && count > 0 && <span className="sm:hidden tabular-nums">{count}</span>}
        </button>
      </div>
    </header>
  );
}
