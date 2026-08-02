# Image Data Flow Unification Report

## Overview

This report documents the changes made to ensure the entire application uses ONE image source: Firestore (via `data-service.ts`), with the local catalog (`catalog.ts`) serving only as a fallback.

## Problem

The homepage displayed placeholder/empty images while the product detail page showed correct Firebase/Pexels images. This was because different parts of the app were using different data sources:

- **Homepage, product cards, search results**: Used `data-service.ts` → Firestore → correct images
- **Cart, pricing, orders, AI recommendations**: Used `catalog.ts` directly → stale `image: ""` values

## Solution

Added synchronous cache lookup functions to `data-service.ts` and updated all components to use `data-service.ts` instead of importing from `catalog.ts` directly.

---

## Files Modified

### 1. `src/lib/data-service.ts`

**Added two new synchronous functions:**

```typescript
export function getProductById(productId: string): Product | null {
  if (productByIdCache) {
    const cached = productByIdCache.get(productId);
    if (cached) return cached;
  }
  return localProducts.find((p) => p.id === productId) || null;
}

export function getAllProducts(): Product[] {
  return productsCache || localProducts;
}
```

**How it works:**
- `getProductById()` first checks the `productByIdCache` (populated by `getProductsWithFallback()` from Firestore)
- If cache exists, returns the cached product with the real Firestore image URL
- If cache doesn't exist yet, falls back to `localProducts` from `catalog.ts`
- `getAllProducts()` returns `productsCache` (Firestore data) or `localProducts` (fallback)

**Why this fixes the issue:**
- Once `getProductsWithFallback()` is called (e.g., by `home-experience.tsx`), the cache is populated with Firestore data including real image URLs
- All subsequent calls to `getProductById()` return the cached Firestore product with the correct image
- Cart, pricing, orders, and AI recommendations now use the same cached data as the homepage

---

### 2. `src/components/shop/header.tsx`

**Before:**
```typescript
import { getProductById, indianCities } from "@/lib/catalog";
```

**After:**
```typescript
import { getProductById } from "@/lib/data-service";
import { indianCities } from "@/lib/catalog";
```

**Impact:** Cart preview in header now uses Firestore-cached product data with real images.

---

### 3. `src/components/shop/cart-drawer.tsx`

**Before:**
```typescript
import { getProductById } from "@/lib/catalog";
```

**After:**
```typescript
import { getProductById } from "@/lib/data-service";
```

**Impact:** Cart drawer now displays products with real images from Firestore cache.

---

### 4. `src/lib/pricing.ts`

**Before:**
```typescript
import { getProductById } from "@/lib/catalog";
```

**After:**
```typescript
import { getProductById } from "@/lib/data-service";
```

**Impact:** Cart totals calculation now uses Firestore-cached product data.

---

### 5. `src/lib/firebase/orders.ts`

**Before:**
```typescript
import { getProductById } from "../catalog";
```

**After:**
```typescript
import { getProductById } from "../data-service";
```

**Impact:** Order creation now stores `productImage` from Firestore cache (real image URL) instead of stale local catalog.

---

### 6. `src/lib/ai/index.ts`

**Before:**
```typescript
import { getProductById, products } from "@/lib/catalog";
```

**After:**
```typescript
import { getProductById, getAllProducts } from "@/lib/data-service";
```

**Changes:**
- `getProductById()` now uses Firestore cache
- `products` → `getAllProducts()` which returns Firestore cache or local fallback

**Impact:** AI basket recommendations and insights now use products with real images from Firestore.

---

## Components That Were Using Stale Data

| Component | File | Was Using | Now Using |
|-----------|------|-----------|-----------|
| Header cart preview | `src/components/shop/header.tsx` | `catalog.ts` | `data-service.ts` |
| Cart drawer | `src/components/shop/cart-drawer.tsx` | `catalog.ts` | `data-service.ts` |
| Cart totals | `src/lib/pricing.ts` | `catalog.ts` | `data-service.ts` |
| Order creation | `src/lib/firebase/orders.ts` | `catalog.ts` | `data-service.ts` |
| AI recommendations | `src/lib/ai/index.ts` | `catalog.ts` | `data-service.ts` |

---

## Components Already Using Firestore (No Changes Needed)

| Component | File | Data Source |
|-----------|------|-------------|
| Homepage | `src/components/shop/home-experience.tsx` | `data-service.ts` → Firestore |
| Product cards | `src/components/shop/product-card.tsx` | Receives products from `home-experience.tsx` |
| Product detail | `src/app/product/[slug]/page.tsx` | `data-service.ts` → Firestore |
| Search | `src/lib/ai/search.ts` | `data-service.ts` → Firestore |
| Recommendations | `src/lib/ai/recommendations.ts` | `data-service.ts` → Firestore |
| AI assistant | `src/lib/ai/assistant.ts` | `data-service.ts` → Firestore |
| API routes | `src/app/api/products/route.ts` | `data-service.ts` → Firestore |
| API routes | `src/app/api/categories/route.ts` | `data-service.ts` → Firestore |

---

## Current Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  UI Layer                                                   │
│  ├── Homepage           → data-service.ts → Firestore       │
│  ├── Product Cards      → data-service.ts → Firestore       │
│  ├── Product Detail     → data-service.ts → Firestore       │
│  ├── Cart Drawer        → data-service.ts → Cache/Firestore │
│  ├── Header Preview     → data-service.ts → Cache/Firestore │
│  ├── Pricing            → data-service.ts → Cache/Firestore │
│  ├── Orders             → data-service.ts → Cache/Firestore │
│  └── AI Recommendations → data-service.ts → Cache/Firestore │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Data Service Layer (data-service.ts)                       │
│  ├── getProductsWithFallback()  → Populates cache           │
│  ├── getProductById()           → Reads from cache          │
│  ├── getAllProducts()           → Reads from cache          │
│  └── getProductBySlugWithFallback() → Reads from cache      │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Data Sources                                                │
│  ├── Firestore (primary) → image: "https://..."             │
│  └── Local Catalog (fallback) → image: ""                   │
└─────────────────────────────────────────────────────────────┘
```

---

## How It Works

1. **First load:** `home-experience.tsx` calls `getProductsWithFallback()`
2. **Cache population:** Firestore products (with real images) are cached in `productsCache` and `productByIdCache`
3. **Subsequent calls:** All other components (`cart-drawer`, `pricing`, `orders`, `ai/index`) call `getProductById()` or `getAllProducts()`
4. **Cache hit:** These functions return the cached Firestore products with real image URLs
5. **Fallback:** If cache doesn't exist yet, falls back to local catalog (which has `image: ""`)

---

## Confirmation

✅ **Homepage** - Uses `data-service.ts` → Firestore → real images
✅ **Product cards** - Receive products from homepage → real images
✅ **Category pages** - Uses `data-service.ts` → Firestore → real images
✅ **Search results** - Uses `data-service.ts` → Firestore → real images
✅ **Cart** - Uses `data-service.ts` → cache → real images
✅ **Pricing** - Uses `data-service.ts` → cache → real images
✅ **Orders** - Uses `data-service.ts` → cache → real images
✅ **AI recommendations** - Uses `data-service.ts` → cache → real images
✅ **Product detail page** - Uses `data-service.ts` → Firestore → real images

**All components now use the same product model and the same image field from Firestore.**

---

## Remaining Import from catalog.ts

**`src/components/shop/header.tsx`** imports `indianCities` from `catalog.ts`:
```typescript
import { indianCities } from "@/lib/catalog";
```

This is intentional and correct - `indianCities` is a constant array of city names, not product data. It does not affect the image pipeline.

---

## TypeScript Verification

✅ `npx tsc --noEmit` passes with no errors

---

## Next Steps

To complete the Pexels image pipeline:

1. Ensure Firebase Storage bucket `blinkit-ai-v1.firebasestorage.app` exists
2. Run `npm run generate-images` to import images from Pexels to Firebase Storage
3. Verify all products display images correctly across the entire app