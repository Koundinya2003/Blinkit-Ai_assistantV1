"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Clock, Star, ShoppingBag, Check } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { QuantityStepper } from "@/components/shop/quantity-stepper";
import { useCartStore } from "@/store/cart-store";
import { useWishlist } from "@/hooks/use-wishlist";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const { productIds: wishlistItems, toggleItem: toggleWishlist } = useWishlist();
  const isInWishlist = wishlistItems.includes(product.id);

  const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100);
  const hasDiscount = discount > 0;
  const isLowStock = product.stock && product.stock < 10;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAddingToCart(true);
    addItem(product.id);
    toast.success("Added to cart", {
      description: product.name,
      duration: 1500
    });
    setTimeout(() => setIsAddingToCart(false), 300);
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product.id);
    toast.success(isInWishlist ? "Removed from wishlist" : "Added to wishlist", {
      duration: 1500
    });
  };

  return (
    <article className="group flex h-full flex-col rounded-xl border border-border bg-white card-hover overflow-hidden">
      <Link href={`/product/${product.slug}`} className="block flex-1 flex flex-col">
        {/* Image container */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted/30 to-muted/10">
          {/* Skeleton loader */}
          {!isImageLoaded && (
            <div className="absolute inset-0 shimmer" />
          )}
          
          <Image
            src={product.image}
            alt={`${product.brand} ${product.name} - ${product.unit}`}
            fill
            sizes="(max-width: 768px) 45vw, (max-width: 1024px) 30vw, 180px"
            className={`object-cover transition-all duration-500 group-hover:scale-110 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            onLoad={() => setIsImageLoaded(true)}
          />

          {/* Badges */}
          <div className="absolute left-2 top-2 flex flex-col gap-1.5">
            {hasDiscount && (
              <span className="badge-discount">
                {discount}% OFF
              </span>
            )}
            {isLowStock && (
              <span className="rounded-md bg-orange-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                Only {product.stock} left
              </span>
            )}
          </div>

          {/* Wishlist button */}
          <button
            onClick={handleWishlistToggle}
            className="absolute right-2 top-2 rounded-full bg-white/90 p-2 shadow-md transition-smooth hover:scale-110 hover:bg-white"
            aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart 
              className={`h-4 w-4 transition-smooth ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} 
            />
          </button>

          {/* Quick add overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <button
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              className="w-full rounded-lg bg-white py-2.5 text-sm font-bold text-foreground shadow-lg transition-smooth hover:bg-primary hover:text-white disabled:opacity-50"
            >
              {isAddingToCart ? (
                <span className="flex items-center justify-center gap-2">
                  <Check className="h-4 w-4" />
                  Added
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Quick Add
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-3">
          {/* Delivery info */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Clock className="h-3 w-3 text-primary" />
            <span>{product.deliveryMinutes} mins</span>
            {product.stock && product.stock > 10 && (
              <span className="ml-auto flex items-center gap-1 text-green-600">
                <Check className="h-3 w-3" />
                In stock
              </span>
            )}
          </div>

          {/* Product name - no nested Link */}
          <h3 className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-5 text-foreground">
            {product.name}
          </h3>

          {/* Brand and unit */}
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
            {product.brand} · {product.unit}
          </p>

          {/* Rating */}
          <div className="mt-2 flex items-center gap-1">
            <div className="flex items-center gap-0.5">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold">{product.rating}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              ({product.reviews.toLocaleString("en-IN")})
            </span>
          </div>

          {/* Price and add to cart */}
          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-base font-black text-foreground">
                  {formatCurrency(product.price)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-xs text-muted-foreground line-through">
                      {formatCurrency(product.mrp)}
                    </span>
                    <span className="text-[11px] font-bold text-green-600">
                      {discount}% off
                    </span>
                  </>
                )}
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <QuantityStepper productId={product.id} />
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}