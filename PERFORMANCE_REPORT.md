# Performance Audit Report — Blinkit AI

## Phase 1: Instrumentation (Baseline Metrics)

### Environment
- **Framework**: Next.js 15.5.22, React 19.1.0
- **Node**: v25.9.0
- **Dev server**: http://localhost:4000
- **Firebase**: Project `blinkit-ai-v1` — **Firestore API DISABLED** (PERMISSION_DENIED)

### 1. Home Page Render Time
| Metric | Value |
|---|---|
| First load (cold, with compilation) | **2,744 ms** TTFB |
| Subsequent loads (warm) | **336 ms** TTFB |
| Total time (warm) | 338 ms |

> The home page is a **client component shell** (`HomeExperience` has `"use client"`).
> The server renders an empty shell; products are fetched client-side via `useEffect`.
> First Contentful Paint and Largest Contentful Paint occur only after JS hydration + API round-trip.

### 2. Firestore Requests
- **Status**: Firestore API is **disabled** in the `blinkit-ai-v1` project.
- Every `getProducts()` call attempts a Firestore query, fails with `PERMISSION_DENIED`,
  then falls back to the local catalog after a **3-second timeout** (`withTimeout` in `data-service.ts`).
- This adds **2–3 seconds** of latency to every data-fetching API route on first load.
- **Firestore read count**: 0 successful reads (all fail).

### 3. Network Requests (Home Page)
| Request | Status | Time |
|---|---|---|
| `GET /` (HTML shell) | 200 | 327 ms (warm) |
| `GET /api/products` | 200 | 2,443 ms (cold) → 4 ms (warm) |
| `GET /api/categories` | 200 | 752 ms (cold) → 58 ms (warm) |
| Firestore connection attempts | FAILED | PERMISSION_DENIED |

> **Duplicate requests**: `getProductsWithFallback()` is called independently by:
> - `HomeExperience` (client-side `useEffect`)
> - `GET /api/products` route handler
> - `GET /api/products/[slug]` route handler (for related products)
> - `ProductPage` (server-side `getProductsWithFallback()`)
> Each call re-attempts Firestore before falling back.

### 4. Product Data
| Metric | Value |
|---|---|
| Local catalog (`catalog.ts`) | **163 products** |
| Seed data (`seed-data.ts`) | 313 product entries (not used by app) |
| API returns | 163 products (2 pages: 100 + 63) |
| Duplicate IDs | **2**: `britannia-bread`, `britannia-brown-bread` |
| Duplicate slugs | **2**: same as above |
| Broken images | **0** (all use `images.unsplash.com`) |
| Empty fields | **0** |
| Zero-price products | **0** |
| Zero-stock products | **0** |
| Zero-discount products | 4 |

### 5. Categories
| Metric | Value |
|---|---|
| Total categories | 10 |
| Categories with products (in first 100) | 6 |
| Missing categories | Personal Care, Baby Care, Instant Food, Staples |
| All `productCount` fields | **0** (Firestore fallback doesn't populate counts) |

### 6. React Renders & Re-renders
- `QuantityStepper` subscribes to `useCartStore((state) => state.items)` — **every cart change re-renders ALL steppers** on the page (6+ per page).
- `Header` subscribes to `useCartStore((state) => state.items)` — re-renders on every cart change.
- `CartDrawer` subscribes to `items`, `loading`, `error`, `isCartOpen` — re-renders on every cart change.
- `AiBasketPanel` fires a `useQuery` on every cart change (API call to `/api/ai/basket`).
- No `React.memo` on `ProductCard` or `QuantityStepper`.

### 7. Cart System
| Metric | Value |
|---|---|
| `useCart` hook usage | **0 components use it** (defined but never imported) |
| Cart persistence | **None** — `QuantityStepper` calls `useCartStore.addItem` directly |
| Cart loading | **Never called** — `loading` stays `true` forever |
| Cart drawer state | `isCartOpen` starts `false`, `openCart()` sets `true` |
| Optimistic updates | Store does optimistic `set()`, but no persistence |

### 8. Bundle Size
- Not yet measured (pending `next build` analysis).

### 9. Console Errors
- `@firebase/firestore: Firestore (12.16.0): GrpcConnection RPC 'Listen' stream error. Code: 7 Message: 7 PERMISSION_DENIED`
- Repeated on every data-fetching API call.

---

## Phase 2: Bottlenecks Identified

### Critical
| # | Bottleneck | Impact |
|---|---|---|
| 1 | **Firestore disabled** — every data fetch times out after 3s before falling back | +2-3s latency per request |
| 2 | **`useCart` hook never used** — no cart persistence, `loading` stuck at `true` | Cart drawer shows "Loading cart..." forever; items lost on refresh |
| 3 | **Cart drawer never opens** — `loading=true` blocks drawer content rendering | Drawer shows loading spinner instead of cart items |

### High
| # | Bottleneck | Impact |
|---|---|---|
| 4 | **Home page is client-only** — no SSR for product data | FCP/LCP delayed by JS hydration + API round-trip |
| 5 | **Duplicate product IDs** — `britannia-bread`, `britannia-brown-bread` | Wrong product shown, cart conflicts |
| 6 | **Repeated Firestore attempts** — `getProductsWithFallback` called 4+ times | 4+ × 3s timeout = 12s wasted |
| 7 | **Excessive re-renders** — `QuantityStepper` and `Header` subscribe to entire `items` array | All steppers re-render on any cart change |
| 8 | **`AiBasketPanel` fires API on every cart change** | Unnecessary network requests |

### Medium
| # | Bottleneck | Impact |
|---|---|---|
| 9 | **No `React.memo`** on `ProductCard`, `QuantityStepper` | Unnecessary re-renders |
| 10 | **`getProductBySlugWithFallback` / `getProductByIdWithFallback` don't use cache** | Re-fetches all products for single-product lookups |
| 11 | **Product page re-fetches all products** for related items | Duplicate data fetch |
| 12 | **Module-level cache not shared** across API route invocations | Each route re-fetches |

### Low
| # | Bottleneck | Impact |
|---|---|---|
| 13 | **No lazy loading** for heavy components | Larger initial bundle |
| 14 | **`reactStrictMode: true`** doubles effect execution in dev | Slower dev experience |
| 15 | **No image `onError` fallback** | Broken images show blank (currently none broken, but no safety net) |

---

## Phase 3: Optimizations (Planned Order)

1. Remove duplicate network requests
2. Parallelize independent async operations
3. Cache expensive queries
4. Reduce Firestore reads (skip when disabled)
5. Move unnecessary client logic to server components
6. Memoize expensive React components
7. Fix unnecessary Context re-renders
8. Lazy load heavy components
9. Optimize images
10. Reduce JavaScript bundle size

## Phases 4–8: Pending

- Phase 4: Verify cart (Add To Cart)
- Phase 5: Verify cart drawer
- Phase 6: Verify product data (16 products issue)
- Phase 7: Images
- Phase 8: Final report
