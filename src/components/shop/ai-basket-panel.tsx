"use client";

import { Sparkles, TrendingUp, Lightbulb, ArrowRight, CheckCircle2, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getBasketInsights, getBasketRecommendations } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";
import { formatCurrency } from "@/lib/utils";
import { getProductImage } from "@/lib/product-image";
import { ProductCard } from "@/components/shop/product-card";
import { useState } from "react";
import Image from "next/image";

export function AiBasketPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const cart = items.map(item => ({ productId: item.productId, quantity: item.quantity }));
  const localInsights = getBasketInsights(cart);
  const localRecommendations = getBasketRecommendations(cart);

  const { data } = useQuery({
    queryKey: ["basket-ai", cart],
    queryFn: async () => {
      const response = await fetch("/api/ai/basket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart })
      });
      return response.json() as Promise<{ assistantNote?: string }>;
    },
    enabled: cart.length > 0,
    staleTime: 30_000
  });

  if (cart.length === 0) return null;

  return (
    <section className="rounded-2xl bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-5 border border-purple-200/50 shadow-card animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-foreground">Smart Basket Assistant</h2>
            <p className="text-xs text-muted-foreground">Personalized for your cart</p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-lg p-2 transition-smooth hover:bg-white/50"
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          <ArrowRight className={`h-5 w-5 text-primary transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* AI Assistant Note */}
      {data?.assistantNote && (
        <div className="mb-4 rounded-xl bg-white/80 p-4 border border-purple-200/50">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-foreground mb-1">Pro Tip</p>
              <p className="text-sm leading-5 text-muted-foreground">{data.assistantNote}</p>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="space-y-2 mb-4">
        {localInsights.map((insight) => (
          <div key={insight.title} className="flex items-start gap-3 rounded-xl bg-white/80 p-3 border border-purple-100/50">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{insight.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{insight.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {localRecommendations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-black text-foreground">Complete Your Basket</h3>
          </div>
          
          {isExpanded ? (
            <div className="grid grid-cols-2 gap-3 animate-scale-in">
              {localRecommendations.slice(0, 6).map(({ product }) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {localRecommendations.slice(0, 3).map(({ product, reason }) => (
                <div 
                  key={product.id} 
                  className="flex items-center gap-3 rounded-xl bg-white/80 p-3 border border-purple-100/50 transition-smooth hover:shadow-md cursor-pointer"
                  onClick={() => addItem(product.id)}
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <Image 
                      src={getProductImage(product.slug, product.image)} 
                      alt={product.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold line-clamp-1">{product.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{reason}</p>
                    <p className="text-sm font-black text-primary mt-0.5">{formatCurrency(product.price)}</p>
                  </div>
                  <Button size="sm" className="shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <button
                onClick={() => setIsExpanded(true)}
                className="w-full rounded-xl bg-primary/10 py-2.5 text-sm font-bold text-primary transition-smooth hover:bg-primary/20"
              >
                View All Recommendations
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}