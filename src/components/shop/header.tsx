"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  MapPin, 
  Search, 
  ShoppingBag, 
  Menu, 
  X, 
  ChevronDown,
  Mic,
  Heart,
  User,
  Package,
  Bell
} from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProductById, indianCities } from "@/lib/catalog";

export function Header({ query, onQueryChange }: { query?: string; onQueryChange?: (value: string) => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const items = useCartStore((state) => state.items);
  const openCart = useCartStore((state) => state.openCart);
  const cart = items.map(item => ({ productId: item.productId, quantity: item.quantity }));
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  const preview = cart
    .slice(0, 2)
    .map((line) => getProductById(line.productId)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto max-w-7xl">
        {/* Main header row */}
        <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden rounded-lg p-2 transition-smooth hover:bg-muted"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo and location */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-black text-xl transition-smooth group-hover:scale-105">
                b
              </div>
              <div className="hidden sm:block">
                <div className="text-xl font-black tracking-tight text-foreground">blinkit</div>
              </div>
            </Link>
            
            {/* Location selector */}
            <button
              onClick={() => setIsLocationOpen(!isLocationOpen)}
              className="hidden md:flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-smooth hover:bg-muted"
              aria-label="Select delivery location"
              aria-expanded={isLocationOpen}
            >
              <MapPin className="h-4 w-4 text-primary" />
              <span className="max-w-[150px] truncate">{indianCities[0]}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Search bar - Desktop */}
          <div className="hidden flex-1 lg:block">
            <div className="relative group">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-smooth group-focus-within:text-primary" aria-hidden="true" />
              <Input
                value={query}
                onChange={(event) => onQueryChange?.(event.target.value)}
                className="search-input pr-10"
                placeholder="Search for milk, atta, diapers, coffee..."
                aria-label="Search products"
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-smooth hover:bg-muted"
                aria-label="Voice search"
              >
                <Mic className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1 sm:gap-2 ml-auto">
            {/* Orders */}
            <Link href="/orders">
              <Button variant="ghost" size="sm" className="hidden sm:flex gap-2 font-semibold">
                <Package className="h-4 w-4" />
                <span className="hidden xl:inline">Orders</span>
              </Button>
            </Link>

            {/* Wishlist */}
            <Link href="/wishlist">
              <Button variant="ghost" size="sm" className="hidden sm:flex gap-2 font-semibold">
                <Heart className="h-4 w-4" />
                <span className="hidden xl:inline">Wishlist</span>
              </Button>
            </Link>

            {/* Profile */}
            <Link href="/profile">
              <Button variant="ghost" size="icon" className="hidden sm:flex" aria-label="Profile">
                <User className="h-5 w-5" />
              </Button>
            </Link>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="hidden sm:flex relative" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            </Button>

            {/* Cart */}
            <Button 
              onClick={openCart} 
              className="relative gap-2 bg-primary hover:bg-primary/90 font-semibold shadow-md hover:shadow-lg transition-smooth"
              aria-label={`Shopping cart with ${count} items`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">{count ? `${count} items` : "Cart"}</span>
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-primary ring-2 ring-primary">
                  {count}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Search bar - Mobile */}
        <div className="lg:hidden px-4 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => onQueryChange?.(event.target.value)}
              className="pl-10 pr-10"
              placeholder="Search groceries..."
              aria-label="Search products"
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1"
              aria-label="Voice search"
            >
              <Mic className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          {preview && (
            <button 
              onClick={openCart}
              className="mt-2 flex items-center gap-2 text-xs font-semibold text-primary"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              In cart: {preview}
            </button>
          )}
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="border-t border-border bg-white lg:hidden animate-slide-in-right">
            <div className="px-4 py-3 space-y-1">
              <Link
                href="/orders"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-smooth hover:bg-muted"
                onClick={() => setIsMenuOpen(false)}
              >
                <Package className="h-5 w-5 text-muted-foreground" />
                Orders
              </Link>
              <Link
                href="/wishlist"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-smooth hover:bg-muted"
                onClick={() => setIsMenuOpen(false)}
              >
                <Heart className="h-5 w-5 text-muted-foreground" />
                Wishlist
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-smooth hover:bg-muted"
                onClick={() => setIsMenuOpen(false)}
              >
                <User className="h-5 w-5 text-muted-foreground" />
                Profile
              </Link>
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-smooth hover:bg-muted"
                onClick={() => {
                  setIsLocationOpen(!isLocationOpen);
                  setIsMenuOpen(false);
                }}
              >
                <MapPin className="h-5 w-5 text-muted-foreground" />
                {indianCities[0]}
                <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}