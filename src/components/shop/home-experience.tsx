"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { 
  Bike, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles,
  TrendingUp,
  Zap,
  Award,
  Clock
} from "lucide-react";
import { Header } from "@/components/shop/header";
import { ProductCard } from "@/components/shop/product-card";
import { ProductCardSkeleton, CategorySkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { getCategoriesWithFallback, getProductsWithFallback } from "@/lib/data-service";
import type { Category, Product, CategoryDoc } from "@/lib/types";

export function HomeExperience() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 300);

  const handleSmoothScroll = useCallback(() => {
    const element = document.getElementById('product-grid');
    element?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [cats, prods] = await Promise.all([
          getCategoriesWithFallback(),
          getProductsWithFallback()
        ]);
        setCategories(cats);
        setProducts(prods);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load data";
        setError(message);
        toast.error("Failed to load products", {
          description: message,
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "All" || product.category === category;
      const matchesQuery =
        !normalized ||
        [product.name, product.brand, product.category, product.unit, ...product.tags]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, query, products]);

  // Get featured products (with discounts)
  const featuredProducts = useMemo(() => {
    return products
      .filter(p => ((p.mrp - p.price) / p.mrp) * 100 > 20)
      .slice(0, 6);
  }, [products]);

  // Get trending products (high rating)
  const trendingProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6);
  }, [products]);

  return (
    <ErrorBoundary>
      <Header query={query} onQueryChange={setQuery} />
      <main className="mx-auto max-w-7xl px-4 pb-20">
        {/* Hero Banner Carousel */}
        <section className="mt-4 animate-fade-in">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-6 md:p-10 shadow-elevated">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm">
                <Zap className="h-4 w-4" />
                Lightning fast delivery
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight text-white md:text-5xl lg:text-6xl">
                Groceries delivered in minutes
              </h1>
              <p className="mt-3 max-w-lg text-sm font-medium leading-6 text-white/90 md:text-base">
                Get fresh groceries, daily essentials, and more delivered to your doorstep in 10-15 minutes. Shop now!
              </p>
              <button 
                onClick={handleSmoothScroll}
                className="mt-6 rounded-xl bg-white px-6 py-3 text-sm font-bold text-primary shadow-lg transition-smooth hover:shadow-xl hover:scale-105 active:scale-95"
              >
                Start Shopping
              </button>
            </div>
            <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -top-10 -right-20 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
          </div>
        </section>

        {/* Promotional Cards */}
        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/50 p-4 border border-orange-200/50 card-hover">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-white">
              <Bike className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-black text-foreground">10-15 min</h3>
            <p className="mt-1 text-xs text-muted-foreground">Fast delivery</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 border border-blue-200/50 card-hover">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-black text-foreground">100% genuine</h3>
            <p className="mt-1 text-xs text-muted-foreground">Quality assured</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 p-4 border border-green-200/50 card-hover">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500 text-white">
              <Award className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-black text-foreground">Best prices</h3>
            <p className="mt-1 text-xs text-muted-foreground">Great deals daily</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 border border-purple-200/50 card-hover">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500 text-white">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-black text-foreground">24/7 support</h3>
            <p className="mt-1 text-xs text-muted-foreground">Always here</p>
          </div>
        </section>

        {/* Category Strip */}
        <section className="mt-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black text-foreground">Shop by Category</h2>
            <button className="text-sm font-semibold text-primary hover:text-primary/80 transition-smooth">
              See All
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" role="tablist" aria-label="Product categories">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <CategorySkeleton key={i} />)
            ) : (
              categories.map((item) => (
                <button
                  key={item.name}
                  onClick={() => setCategory(item.name)}
                  className={`category-chip flex flex-col items-center gap-2 min-w-[80px] ${
                    category === item.name ? "active" : ""
                  }`}
                  role="tab"
                  aria-selected={category === item.name}
                  aria-controls="product-grid"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted/50 text-2xl">
                    {item.icon}
                  </div>
                  <span className="text-xs font-semibold">{item.name}</span>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Deals of the Day */}
        {featuredProducts.length > 0 && (
          <section className="mt-8 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-orange-500" />
                <h2 className="text-xl font-black text-foreground">Deals of the Day</h2>
              </div>
              <button className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-smooth">
                View All <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Trending Near You */}
        {trendingProducts.length > 0 && (
          <section className="mt-8 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-500" />
                <h2 className="text-xl font-black text-foreground">Trending Near You</h2>
              </div>
              <button className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-smooth">
                View All <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {trendingProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* All Products */}
        <section className="mt-8" id="product-grid">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-foreground">
                {category === "All" ? "Fresh picks for you" : category}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
                {loading ? "Loading products..." : error ? "Failed to load" : `${filtered.length} products available near you`}
              </p>
            </div>
          </div>
          {error ? (
            <EmptyState
              icon="offline"
              title="Unable to load products"
              description={error}
                action={{
                  label: "Try again",
                  onClick: handleRetry
                }}
            />
          ) : loading ? (
            <div 
              className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
              aria-busy="true"
              aria-label="Loading products"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="search"
              title="No products found"
              description={debouncedQuery ? `We couldn't find anything matching "${debouncedQuery}"` : "No products available in this category"}
            />
          ) : (
            <div 
              className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
              role="tabpanel"
              aria-label="Product grid"
            >
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </main>
    </ErrorBoundary>
  );
}