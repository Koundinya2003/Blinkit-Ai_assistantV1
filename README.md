# Blinkit — Intent to Basket

> Instead of searching for what you need, tell Blinkit what you want to achieve.
> Blinkit works out what you need and builds the basket for you.

A quick-commerce shopping experience where the primary input is an outcome, not a
keyword. Type *"I want to make biryani for 2"* or *"dinner for 4 under ₹600"* and
the app plans the meal, scales the ingredients to the head count, maps every
ingredient to a real product in the catalogue, works out how many packs to buy,
fits the whole thing to the budget, and hands you a basket you can edit and check
out.

## The core flow

```
natural language  →  intent  →  meal plan  →  scaled ingredients
                                                     ↓
   checkout  ←  cart  ←  editable basket  ←  real products + pack counts
```

Every step is a real artefact in the codebase, not a prompt-and-print:

| Step | Where it lives | What it does |
| --- | --- | --- |
| Intent | `src/lib/ai/intent.ts` | Reads dish, occasion, head count, budget, diet and constraints out of the sentence |
| Plan | `src/lib/ai/planner.ts` | Chooses the dishes, prices each candidate against the catalogue, and spends the budget on the best menu that fits |
| Quantities | `src/lib/ai/recipes.ts`, `src/lib/catalog/units.ts` | Per-serving amounts scaled linearly, sub-linearly or fixed; unit conversion including per-piece weights ("2 onions" from a 1 kg pack) |
| Products | `src/lib/ai/matcher.ts` | Ranks catalogue products for each ingredient by key match, pack fit, waste, rating and price |
| Budget | `src/lib/ai/planner.ts` | Swaps to cheaper packs, then drops optional ingredients, then explains the shortfall honestly |
| Basket | `src/lib/ai/basket.ts` | Orchestrates the above and applies the shopper's swaps and removals |

### Why the model never names a product

The LLM plans in **ingredient space** only — it returns canonical ingredient keys
and quantities, never brands, products or prices. Deterministic code maps those
keys onto the catalogue. That means the model cannot hallucinate a product that
does not exist, cannot invent a price, and cannot recommend something out of
stock. It also means the feature degrades cleanly: with no `OPENROUTER_API_KEY`
the app falls back to a built-in recipe knowledge base and rule-based intent
parsing, and every screen still works end to end.

## What the shopper can do with a plan

- Add any single ingredient, or the whole plan, to the cart
- Change quantities with the standard stepper
- Replace a product — each line lists other catalogue products that satisfy the
  same ingredient, ranked
- Remove ingredients they already have; the total updates and the plan rebuilds
- See exactly why the plan looks the way it does: budget swaps, dropped
  optionals, substitutions and unavailable items are all stated in plain language

## The rest of the store

The AI layer sits inside a working quick-commerce app rather than beside it:
home with category rails, category and sub-category browsing with sorting,
search, product detail pages, a cart drawer, checkout with address and payment,
and an order confirmation that advances through its delivery timeline.

## Product data

`src/lib/catalog/` holds 329 products across 15 aisles, normalised into one
shape with pack sizes parsed into base units (g / ml / piece). The interesting
part is `keys` on each product — canonical ingredient keys such as `chicken`,
`rice-basmati` or `garam-masala`. This is the only contract between the
catalogue and the planner: nothing in the AI layer references a product id, so
`CatalogSource` in `src/lib/catalog/index.ts` can be reimplemented against a live
Blinkit feed without touching anything upstream.

Prices, brands and pack sizes are modelled on real Indian quick-commerce SKUs.
Delivery, stock and payment are simulated.

## Running it

```bash
npm install
cp .env.example .env.local   # optional — the app works without any keys
npm run dev
```

Open http://localhost:3000.

| Script | |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |

### Optional AI configuration

```env
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=anthropic/claude-3.5-haiku
```

With a key, planning is done by the model and the plan header reads "AI plan".
Without one it reads "Blinkit plan" and the deterministic planner runs. The app
never claims to have used a model it did not.

## Layout

```
src/
├── app/                      routes
│   ├── page.tsx              home
│   ├── plan/                 intent → basket
│   ├── search/               search results
│   ├── category/[slug]/      aisle browsing
│   ├── product/[slug]/       product detail
│   ├── checkout/             address + payment
│   ├── order/[id]/           confirmation and delivery timeline
│   └── api/plan|products|categories
├── components/
│   ├── plan/                 plan view, ingredient lines, product swapping
│   ├── shop/                 header, cart drawer, product card, checkout
│   └── ui/                   button, skeleton, empty state
└── lib/
    ├── ai/                   intent, recipes, occasions, planner, matcher, LLM
    ├── catalog/              products, taxonomy, units, CatalogSource
    ├── shop/                 pricing, orders
    └── store/                cart (zustand, persisted)
```

## Stack

Next.js 15 (App Router), TypeScript, Tailwind, Zustand, React Hook Form + Zod,
Framer Motion, OpenRouter (optional).
