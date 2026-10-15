<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/01_hero_dark.svg">
  <img src="docs/readme/01_hero_light.svg" width="100%" alt="Intent to Basket, a quick commerce shopping experiment. Headline: Say the meal. Get the basket. Instead of searching for what you need, tell the store what you want to achieve. Type I want to make biryani for 2 or dinner for 4 under 600 rupees, and the app plans the meal, scales the ingredients to the head count, maps every ingredient to a real catalogue product, works out how many packs to buy, fits the budget and hands you an editable basket. Example receipt, Chicken Biryani for 2: basmati rice 250 g, chicken 400 g, onion 2 pieces, curd 150 g, ginger garlic paste 31 g, biryani masala 1 pack, cooking oil 31 ml, mint 23 g, coriander 23 g, plus optional whole spices and saffron. 11 ingredients, 2 optional. Numbers: 329 products, 15 aisles, 41 dishes, 7 occasions, 0 API keys required. Delivery, stock and payment are simulated.">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/02_route_dark.svg">
  <img src="docs/readme/02_route_light.svg" width="100%" alt="The core flow, drawn as a delivery route. A sentence becomes an intent, a meal plan, scaled ingredients, real products with pack counts, an editable basket, then cart and checkout. Every step is real code. Intent, in intent.ts: reads dish, occasion, head count, budget, diet and constraints out of the sentence. Plan, in planner.ts: chooses the dishes, prices each candidate against the catalogue and spends the budget on the best menu that fits. Quantities, in recipes.ts and units.ts: per serving amounts scaled linearly, sub linearly or fixed, with unit conversion including per piece weights. Products, in matcher.ts: ranks catalogue products for each ingredient by key match, pack fit, waste, rating and price. Budget, in planner.ts: swaps to cheaper packs, then drops optional ingredients, then explains the shortfall honestly. Basket, in basket.ts: orchestrates the above and applies the shopper's swaps and removals.">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/03_guardrail_dark.svg">
  <img src="docs/readme/03_guardrail_light.svg" width="100%" alt="Why the model never names a product. The language model plans in ingredient space only: it returns canonical ingredient keys and quantities, such as chicken 400 g, onion 2 pieces, curd 150 g, saffron 1. Deterministic code maps those keys onto the catalogue and decides the product, brand, pack size, pack count, price and stock. So the model cannot hallucinate a product that does not exist, cannot invent a price, and cannot recommend something out of stock. The feature degrades cleanly: with OPENROUTER_API_KEY set, planning is done by the model and the plan header reads AI plan. Without a key it reads Blinkit plan, a built in recipe knowledge base and rule based intent parsing take over, and every screen still works end to end. The app never claims to have used a model it did not.">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/04_math_dark.svg">
  <img src="docs/readme/04_math_light.svg" width="100%" alt="The kitchen maths. Scaling: per serving amounts scale three ways. Linear for staples like rice and chicken. Sub linear, servings to the power 0.65, for oil, pastes and herbs, so 10 servings need about 4.5 times one serving, not 10 times. Fixed for spices: you buy one pack of garam masala whether you cook for two or ten. Unit conversion includes per piece weights, so 2 onions can come from a 1 kg pack. Product ranking in matcher.ts adds points for ingredient key match, how much of the ingredient label the product name says back, rating and popularity, and subtracts for pack waste, extra packs and cost. The budget ladder: first swap to cheaper packs, then drop optional ingredients, then explain the shortfall in plain language.">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/05_shopper_dark.svg">
  <img src="docs/readme/05_shopper_light.svg" width="100%" alt="What the shopper can do with a plan: add any single ingredient or the whole plan to the cart, change quantities with the standard stepper, replace a product from a ranked list of other catalogue products that satisfy the same ingredient, remove ingredients they already have so the total updates and the plan rebuilds, and see exactly why the plan looks the way it does, with budget swaps, dropped optionals, substitutions and unavailable items stated in plain language. Example plan line: Onion, need 2 pieces, Onions 1 kg pack at 35 rupees, with alternatives Onions small pack 500 g at 22 rupees and Organic Onions 1 kg at 68 rupees. The rest of the store is a working quick commerce app: home with category rails, category and sub category browsing with sorting, search, product pages, a cart drawer, checkout with address and payment, and an order confirmation that advances through order placed, packed, on the way and delivered. Cart rules: free delivery above 499 rupees, otherwise a 25 rupee delivery fee, plus a 6 rupee handling fee.">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/06_stack_dark.svg">
  <img src="docs/readme/06_stack_light.svg" width="100%" alt="Stack and running it. Next.js 15 with the App Router, TypeScript, Tailwind, Zustand for a persisted cart, React Hook Form with Zod, Framer Motion, and OpenRouter as an optional model provider, deployed with a Vercel config in the bom1 region. Run it with npm install, copy .env.example to .env.local (optional, the app works without any keys), then npm run dev and open localhost port 3000. Environment variables: NEXT_PUBLIC_APP_URL, OPENROUTER_API_KEY, OPENROUTER_MODEL. Built to swap in a live feed: nothing in the AI layer references a product id, so CatalogSource in src/lib/catalog/index.ts can be reimplemented against a live catalogue without touching anything upstream.">
</picture>

# Intent to Basket

Instead of searching for what you need, tell the store what you want to achieve. It works out what you need and builds the basket for you.

A quick commerce shopping experience where the primary input is an outcome, not a keyword. Type *"I want to make biryani for 2"* or *"dinner for 4 under ₹600"* and the app plans the meal, scales the ingredients to the head count, maps every ingredient to a real product in the catalogue, works out how many packs to buy, fits the whole thing to the budget, and hands you a basket you can edit and check out.

## The core flow

```
natural language  →  intent  →  meal plan  →  scaled ingredients
                                                     ↓
   checkout  ←  cart  ←  editable basket  ←  real products + pack counts
```

Every step is a real artefact in the codebase, not a prompt and print:

* **Intent** (`src/lib/ai/intent.ts`): reads dish, occasion, head count, budget, diet and constraints out of the sentence.
* **Plan** (`src/lib/ai/planner.ts`): chooses the dishes, prices each candidate against the catalogue, and spends the budget on the best menu that fits.
* **Quantities** (`src/lib/ai/recipes.ts`, `src/lib/catalog/units.ts`): per serving amounts scaled linearly, sub linearly or fixed; unit conversion including per piece weights ("2 onions" from a 1 kg pack).
* **Products** (`src/lib/ai/matcher.ts`): ranks catalogue products for each ingredient by key match, pack fit, waste, rating and price.
* **Budget** (`src/lib/ai/planner.ts`): swaps to cheaper packs, then drops optional ingredients, then explains the shortfall honestly.
* **Basket** (`src/lib/ai/basket.ts`): orchestrates the above and applies the shopper's swaps and removals.

### Why the model never names a product

The LLM plans in **ingredient space** only. It returns canonical ingredient keys and quantities, never brands, products or prices. Deterministic code maps those keys onto the catalogue. That means the model cannot hallucinate a product that does not exist, cannot invent a price, and cannot recommend something out of stock. It also means the feature degrades cleanly: with no `OPENROUTER_API_KEY` the app falls back to a built in recipe knowledge base and rule based intent parsing, and every screen still works end to end.

## What the shopper can do with a plan

* Add any single ingredient, or the whole plan, to the cart
* Change quantities with the standard stepper
* Replace a product: each line lists other catalogue products that satisfy the same ingredient, ranked
* Remove ingredients they already have; the total updates and the plan rebuilds
* See exactly why the plan looks the way it does: budget swaps, dropped optionals, substitutions and unavailable items are all stated in plain language

## The rest of the store

The AI layer sits inside a working quick commerce app rather than beside it: home with category rails, category and sub category browsing with sorting, search, product detail pages, a cart drawer, checkout with address and payment, and an order confirmation that advances through its delivery timeline.

## Product data

`src/lib/catalog/` holds 329 products across 15 aisles, normalised into one shape with pack sizes parsed into base units (g, ml, piece). The interesting part is `keys` on each product: canonical ingredient keys such as `chicken`, `onion` or `saffron`. This is the only contract between the catalogue and the planner. Nothing in the AI layer references a product id, so `CatalogSource` in `src/lib/catalog/index.ts` can be reimplemented against a live Blinkit feed without touching anything upstream.

Prices, brands and pack sizes are modelled on real Indian quick commerce SKUs. Delivery, stock and payment are simulated.

## Running it

```bash
npm install
cp .env.example .env.local   # optional, the app works without any keys
npm run dev
```

Open http://localhost:3000.

Scripts:

* `npm run dev`: development server
* `npm run build`: production build
* `npm run start`: serve the production build
* `npm run lint`: ESLint
* `npm run typecheck`: TypeScript, no emit

### Optional AI configuration

Set these in `.env.local` (see `.env.example`):

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENROUTER_API_KEY=
OPENROUTER_MODEL=anthropic/claude-3.5-haiku
```

`NEXT_PUBLIC_APP_URL` is used for metadata and the OpenRouter referer header. With a key in `OPENROUTER_API_KEY`, planning is done by the model and the plan header reads "AI plan". Without one it reads "Blinkit plan" and the deterministic planner runs. The app never claims to have used a model it did not.

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

Next.js 15 (App Router), TypeScript, Tailwind, Zustand, React Hook Form + Zod, Framer Motion, OpenRouter (optional). A `vercel.json` is included for deployment.

## Rebuilding the panels

The images at the top are generated. Edit `docs/readme/one_sheet.html`, then run:

```bash
node docs/readme/build_readme_svgs.js docs/readme/one_sheet.html docs/readme 960
```

This needs Node with Playwright and curl (fonts are fetched from Google Fonts and embedded).
