# Image Pipeline Report

## Overview

This report documents the complete cleanup of the product image pipeline in the Blinkit AI project. All previous image sources have been removed, and the project has been prepared for a fresh Pexels-based image implementation.

---

## 1. Every Previous Image Source

The following image sources were identified and removed:

### A. Local Static Assets (`public/images/`)
- **Category images**: `public/images/categories/*.jpg` (10 files)
  - `fruits-vegetables.jpg`, `dairy-breakfast.jpg`, `snacks.jpg`, `beverages.jpg`, `bakery.jpg`, `household.jpg`, `personal-care.jpg`, `baby-care.jpg`, `instant-food.jpg`, `staples.jpg`
- **Product images**: `public/images/products/*.jpg` (100+ files)
  - Product-specific images like `robusta-bananas.jpg`, `apples-shimla.jpg`, `amul-butter.jpg`, etc.

### B. Local Catalog Data (`src/lib/catalog.ts`)
- **Categories array**: Each category had `image: "/images/categories/<slug>.jpg"` pointing to local static assets
- **Products array**: Each product had `image: "/images/products/<slug>.jpg"` pointing to local static assets

### C. Seed Data (`src/lib/seed-data.ts`)
- **Categories array**: Each category had `image: "/images/categories/<slug>.jpg"` (duplicate of catalog.ts)
- **Products array**: Each product had `image: "/images/products/<slug>.jpg"` (duplicate of catalog.ts)

### D. Firestore Documents (via `src/lib/firebase/products.ts` and `src/lib/firebase/categories.ts`)
- Firestore `products` collection stored an `image` field per product document
- Firestore `categories` collection stored an `image` field per category document
- These were populated by `scripts/seed-firestore.ts` which wrote `image: cat.image` from the local catalog

### E. Order Items (via `src/lib/firebase/orders.ts`)
- `buildOrderItemsFromCart()` created `OrderItem` objects with `productImage: product.image`, copying the image URL from the local catalog product at order time

### F. Data Service Fallback (`src/lib/data-service.ts`)
- `getCategoriesWithFallback()` mapped local categories with `icon: cat.icon` and `image: ""` in the fallback path
- `getProductsWithFallback()` fell back to `localProducts` from `catalog.ts` which contained image paths

### G. Image Pipeline Scripts (`scripts/` and `scripts/assets/`)
- `scripts/audit-catalog.ts` — Audited catalog image references
- `scripts/create-placeholders.ts` — Generated placeholder images
- `scripts/fix-all-catalog-images.ts` — Fixed all catalog image paths
- `scripts/fix-all-images.ts` — Fixed all image paths
- `scripts/fix-catalog-images.ts` — Fixed catalog image paths
- `scripts/fix-product-images.ts` — Fixed product image paths
- `scripts/fix-remaining-images.ts` — Fixed remaining image paths
- `scripts/setup-local-images.ts` — Set up local image assets
- `scripts/verify-images.ts` — Verified image existence
- `scripts/assets/asset-pipeline.ts` — Full asset pipeline orchestrator
- `scripts/assets/config.ts` — Asset pipeline configuration
- `scripts/assets/download-images.ts` — Downloaded images from external sources
- `scripts/assets/optimize-images.ts` — Optimized images for web
- `scripts/assets/search-images.ts` — Searched for images
- `scripts/assets/types.ts` — Asset pipeline type definitions
- `scripts/assets/update-catalog.ts` — Updated catalog with image URLs
- `scripts/assets/utils.ts` — Asset pipeline utilities
- `scripts/assets/validate-images.ts` — Validated image dimensions/formats

### H. Generated Reports
- `image-fix-report.json` — Report from image fix scripts
- `image-report.json` — Image audit report
- `audit-report.json` — Catalog audit report

### I. NPM Scripts (`package.json`)
- `"fix-images": "tsx scripts/fix-product-images.ts"` — Script to fix product images
- `"assets": "tsx scripts/assets/asset-pipeline.ts"` — Script to run asset pipeline

---

## 2. Every File Modified

| File | Change |
|------|--------|
| `src/lib/catalog.ts` | All `image: "/images/..."` values replaced with `image: ""` for both categories and products |
| `src/lib/seed-data.ts` | All `image: "/images/..."` values replaced with `image: ""` for both categories and products |
| `scripts/seed-firestore.ts` | Changed `image: cat.image` to `image: ""` in category seeding |
| `package.json` | Removed `"fix-images"` and `"assets"` npm scripts |

### Files NOT Modified (intentionally preserved for Pexels implementation)

| File | Reason |
|------|--------|
| `src/lib/types.ts` | `Product.image: string`, `CategoryDoc.image: string`, `OrderItem.productImage: string` fields kept for Pexels data flow |
| `src/lib/firebase/products.ts` | `image: data.image ?? ""` mapper kept — reads from Firestore (will be `""` after re-seed) |
| `src/lib/firebase/categories.ts` | `image: data.image ?? ""` mapper kept — reads from Firestore (will be `""` after re-seed) |
| `src/lib/firebase/orders.ts` | `productImage: product.image` kept — derives from product (will be `""`) |
| `src/lib/data-service.ts` | Already had `image: ""` in fallback — no change needed |
| `src/components/shop/product-card.tsx` | `<Image src={product.image} ...>` kept for Pexels |
| `src/components/shop/ai-basket-panel.tsx` | `<Image src={product.image} ...>` kept for Pexels |
| `src/app/product/[slug]/page.tsx` | `<Image src={product.image} ...>` and OG metadata kept for Pexels |
| `src/app/orders/page.tsx` | `<Image src={item.productImage} ...>` kept for Pexels |
| `src/app/orders/[orderId]/page.tsx` | `<Image src={item.productImage} ...>` kept for Pexels |
| `src/app/layout.tsx` | `/og-image.png` in OG metadata is site branding, not a product image — left unchanged |
| `next.config.ts` | `images` config (formats, sizes, cache) is optimization config, not image source — left unchanged |
| `src/components/shop/home-experience.tsx` | `item.icon` (emoji) is a text character, not an image source — left unchanged |

---

## 3. Every File Deleted

### Scripts
- `scripts/audit-catalog.ts`
- `scripts/create-placeholders.ts`
- `scripts/fix-all-catalog-images.ts`
- `scripts/fix-all-images.ts`
- `scripts/fix-catalog-images.ts`
- `scripts/fix-product-images.ts`
- `scripts/fix-remaining-images.ts`
- `scripts/setup-local-images.ts`
- `scripts/verify-images.ts`

### Asset Pipeline (entire `scripts/assets/` directory)
- `scripts/assets/asset-pipeline.ts`
- `scripts/assets/config.ts`
- `scripts/assets/download-images.ts`
- `scripts/assets/optimize-images.ts`
- `scripts/assets/search-images.ts`
- `scripts/assets/types.ts`
- `scripts/assets/update-catalog.ts`
- `scripts/assets/utils.ts`
- `scripts/assets/validate-images.ts`
- `scripts/assets/downloads/` (directory)
- `scripts/assets/logs/` (directory)
- `scripts/assets/optimized/` (directory)
- `scripts/assets/reports/` (directory)
- `scripts/assets/validated/` (directory)

### Static Image Assets (entire `public/images/` directory)
- `public/images/categories/*.jpg` (10 files)
- `public/images/products/*.jpg` (100+ files)

### Generated Reports
- `image-fix-report.json`
- `image-report.json`
- `audit-report.json`

---

## 4. Every Image-Related Utility Removed

| Utility | File | Purpose |
|---------|------|---------|
| `audit-catalog.ts` | `scripts/audit-catalog.ts` | Audited catalog for missing/mismatched image references |
| `create-placeholders.ts` | `scripts/create-placeholders.ts` | Generated placeholder images for missing products |
| `fix-all-catalog-images.ts` | `scripts/fix-all-catalog-images.ts` | Bulk-fixed all catalog image paths |
| `fix-all-images.ts` | `scripts/fix-all-images.ts` | Bulk-fixed all image paths across the project |
| `fix-catalog-images.ts` | `scripts/fix-catalog-images.ts` | Fixed catalog image paths |
| `fix-product-images.ts` | `scripts/fix-product-images.ts` | Fixed product image paths |
| `fix-remaining-images.ts` | `scripts/fix-remaining-images.ts` | Fixed remaining broken image paths |
| `setup-local-images.ts` | `scripts/setup-local-images.ts` | Downloaded and set up local image assets |
| `verify-images.ts` | `scripts/verify-images.ts` | Verified image file existence and integrity |
| `asset-pipeline.ts` | `scripts/assets/asset-pipeline.ts` | Full asset pipeline orchestrator (search, download, optimize, validate, update) |
| `config.ts` | `scripts/assets/config.ts` | Asset pipeline configuration (API keys, paths, sizes) |
| `download-images.ts` | `scripts/assets/download-images.ts` | Downloaded images from external APIs |
| `optimize-images.ts` | `scripts/assets/optimize-images.ts` | Optimized/compressed images for web delivery |
| `search-images.ts` | `scripts/assets/search-images.ts` | Searched for images via external APIs |
| `types.ts` | `scripts/assets/types.ts` | Type definitions for asset pipeline |
| `update-catalog.ts` | `scripts/assets/update-catalog.ts` | Updated catalog.ts with new image URLs |
| `utils.ts` | `scripts/assets/utils.ts` | Utility functions for asset pipeline |
| `validate-images.ts` | `scripts/assets/validate-images.ts` | Validated image dimensions, format, file size |

---

## 5. Remaining Image References

The following image references remain in the codebase. These are **intentionally preserved** as the data pipeline for the upcoming Pexels implementation. All `image` and `productImage` values are currently `""` (empty string).

### Type Definitions (`src/lib/types.ts`)
```typescript
Product.image: string        // Currently "" — will hold Pexels URL
CategoryDoc.image: string    // Currently "" — will hold Pexels URL
CategoryDoc.icon: string     // Emoji character (e.g. "🍌") — not an image URL
OrderItem.productImage: string  // Currently "" — derived from Product.image
User.photoURL: string | null    // User avatar from Firebase Auth — not a product image
```

### Data Mappers
- `src/lib/firebase/products.ts` → `image: data.image ?? ""`
- `src/lib/firebase/categories.ts` → `image: data.image ?? ""`
- `src/lib/firebase/orders.ts` → `productImage: product.image`
- `src/lib/data-service.ts` → `image: ""` (fallback), `icon: cat.icon` (emoji)

### UI Components (Next.js `<Image>`)
- `src/components/shop/product-card.tsx` → `<Image src={product.image} ...>`
- `src/components/shop/ai-basket-panel.tsx` → `<Image src={product.image} ...>`
- `src/app/product/[slug]/page.tsx` → `<Image src={product.image} ...>` + OG metadata `images: [{ url: product.image }]`
- `src/app/orders/page.tsx` → `<Image src={item.productImage} ...>`
- `src/app/orders/[orderId]/page.tsx` → `<Image src={item.productImage} ...>`

### Category Display (emoji, not image files)
- `src/components/shop/home-experience.tsx` → `{item.icon}` (renders emoji like 🍌, 🥛)

### Site Branding (not product images)
- `src/app/layout.tsx` → `url: "/og-image.png"` in OpenGraph metadata (site-level branding)

### Next.js Configuration
- `next.config.ts` → `images` config (formats, deviceSizes, imageSizes, minimumCacheTTL) — optimization settings for Next.js Image component

---

## 6. Current Image Pipeline

```
UI Components (<Image src={product.image} />)
    ↓
Data Service (data-service.ts)
    ↓
Product Data (catalog.ts / Firestore)
    ↓
image field (currently "")
```

### Data Flow Detail

```
┌─────────────────────────────────────────────────────┐
│  UI Layer                                           │
│  ├── ProductCard       <Image src={product.image}>  │
│  ├── AiBasketPanel     <Image src={product.image}>  │
│  ├── ProductPage       <Image src={product.image}>  │
│  ├── OrdersPage        <Image src={item.productImage}> │
│  └── OrderDetailPage   <Image src={item.productImage}> │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  Data Service Layer (data-service.ts)               │
│  ├── getProductsWithFallback()                      │
│  ├── getCategoriesWithFallback()                    │
│  ├── getProductBySlugWithFallback()                 │
│  └── getProductByIdWithFallback()                   │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  Data Sources                                        │
│  ├── Firestore (firebase/products.ts)               │
│  │   └── image: data.image ?? ""  →  ""             │
│  ├── Local Catalog (catalog.ts)                     │
│  │   └── image: ""  (all products)                  │
│  └── Seed Data (seed-data.ts)                       │
│      └── image: ""  (all products)                  │
└─────────────────────────────────────────────────────┘
```

### Current State
- **No hardcoded URLs** ✓
- **No static assets** ✓ (`public/images/` deleted)
- **No duplicate sources** ✓ (catalog.ts and seed-data.ts both have `image: ""`)
- **No legacy fallback logic** ✓ (all image fix/placeholder scripts deleted)
- **All `image` fields are `""`** ✓
- **TypeScript compiles without errors** ✓
- **Data flow preserved for Pexels** ✓ (all `<Image>` components and mappers intact)

### What's Ready for Pexels
1. `Product.image: string` field exists and flows through the entire pipeline
2. `CategoryDoc.image: string` field exists and flows through the pipeline
3. `OrderItem.productImage: string` field exists and flows through the pipeline
4. All UI components use `<Image src={...}>` from `next/image`
5. `next.config.ts` has image optimization settings configured
6. Firestore mappers read `data.image` — Pexels URLs can be stored in Firestore and will flow through automatically