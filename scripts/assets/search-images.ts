/**
 * Product Asset Pipeline — Search Query Generation + Multi-Source Image Search
 *
 * Phase 3: Gemini 2.5 Flash generates one optimized retail search query per product.
 * Phase 4: Query is run against enabled providers in priority order.
 *
 * This module is split into two exported functions so the orchestrator can
 * cache query generation and search independently.
 */

import path from "path";
import type { ImageCandidate, ImageSource, ProductAsset } from "./types";
import { GEMINI_TEXT_MODEL, KEYS, PATHS, PROVIDER_PRIORITY } from "./config";
import { log, logError, readJsonCache, withRetry, writeJsonCache } from "./utils";

/* ------------------------------------------------------------------ */
/* Phase 3 — Gemini search query generation                            */
/* ------------------------------------------------------------------ */

const QUERY_CACHE = path.join(PATHS.reports, "search-queries.json");
type QueryMap = Record<string, string>;

function fallbackQuery(p: ProductAsset): string {
  // Deterministic, high-precision query without Gemini.
  const parts = [p.brand, p.name, p.unit, "retail pack front view white background"];
  return parts.filter(Boolean).join(" ").trim();
}

export async function generateSearchQueries(
  products: ProductAsset[],
  force = false
): Promise<QueryMap> {
  const cached = force ? {} : readJsonCache<QueryMap>(QUERY_CACHE) ?? {};
  const result: QueryMap = { ...cached };
  const missing = products.filter((p) => !result[p.id]);

  if (!missing.length) {
    log(`Search queries: all ${products.length} cached.`);
    return result;
  }

  if (!KEYS.googleApiKey) {
    log("GOOGLE_API_KEY missing — using deterministic fallback queries.");
    for (const p of missing) result[p.id] = fallbackQuery(p);
    writeJsonCache(QUERY_CACHE, result);
    return result;
  }

  log(`Generating ${missing.length} search queries via Gemini…`);
  for (const p of missing) {
    try {
      result[p.id] = await withRetry(() => geminiQuery(p), 3, 1000, `query:${p.slug}`);
    } catch (err) {
      logError(`geminiQuery failed for ${p.slug}`, err);
      result[p.id] = fallbackQuery(p);
    }
    writeJsonCache(QUERY_CACHE, result);
  }
  return result;
}

async function geminiQuery(p: ProductAsset): Promise<string> {
  const prompt = `You generate image search queries for an Indian grocery catalog.
Return ONE short, highly specific search query (max 12 words) that will find the
correct retail product photo. Prefer "retail pack", "front view", "white background".
Never return generic words like "butter" alone. Never return cartoon or AI art.

Product:
Name: ${p.name}
Brand: ${p.brand}
Category: ${p.category}
Subcategory: ${p.subcategory}
Unit: ${p.unit}
Description: ${p.description}

Respond with ONLY the search query, no quotes, no explanation.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${KEYS.googleApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 60 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini query HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const clean = text.replace(/["\n]+/g, " ").trim().split("\n")[0].trim();
  return clean || fallbackQuery(p);
}

/* ------------------------------------------------------------------ */
/* Phase 4 — Multi-source image search                                 */
/* ------------------------------------------------------------------ */

const CANDIDATES_CACHE = path.join(PATHS.reports, "candidates.json");
type CandidateMap = Record<string, ImageCandidate[]>;

export async function searchAllProducts(
  products: ProductAsset[],
  queries: QueryMap,
  enabled: Partial<Record<ImageSource, boolean>>,
  maxCandidates: number,
  force = false
): Promise<CandidateMap> {
  const cached = force ? {} : readJsonCache<CandidateMap>(CANDIDATES_CACHE) ?? {};
  const result: CandidateMap = { ...cached };
  const missing = products.filter((p) => !result[p.id] || !result[p.id].length);

  if (!missing.length) {
    log(`Candidates: all ${products.length} cached.`);
    return result;
  }

  log(`Searching images for ${missing.length} products…`);
  for (const p of missing) {
    const query = queries[p.id] ?? fallbackQuery(p);
    try {
      result[p.id] = await withRetry(
        () => searchProduct(query, p, enabled, maxCandidates),
        3,
        1000,
        `search:${p.slug}`
      );
    } catch (err) {
      logError(`searchProduct failed for ${p.slug}`, err);
      result[p.id] = [];
    }
    writeJsonCache(CANDIDATES_CACHE, result);
    log(`  ${p.slug}: ${result[p.id].length} candidates`);
  }
  return result;
}

async function searchProduct(
  query: string,
  p: ProductAsset,
  enabled: Partial<Record<ImageSource, boolean>>,
  max: number
): Promise<ImageCandidate[]> {
  const out: ImageCandidate[] = [];
  const seen = new Set<string>();

  for (const src of PROVIDER_PRIORITY) {
    if (out.length >= max) break;
    if (!enabled[src as ImageSource]) continue;
    try {
      let hits: ImageCandidate[] = [];
      if (src === "google") hits = await searchGoogle(query);
      else if (src === "tavily") hits = await searchTavily(query);
      else if (src === "openfoodfacts") hits = await searchOpenFoodFacts(p);
      else if (src === "wikimedia") hits = await searchWikimedia(query);
      else if (src === "pexels") hits = await searchPexels(query);
      else if (src === "pixabay") hits = await searchPixabay(query);
      else if (src === "unsplash") hits = await searchUnsplash(query);

      for (const h of hits) {
        if (out.length >= max) break;
        if (!h.url || seen.has(h.url)) continue;
        seen.add(h.url);
        out.push(h);
      }
    } catch (err) {
      logError(`provider ${src} failed for ${p.slug}`, err);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Provider implementations                                            */
/* ------------------------------------------------------------------ */

async function searchGoogle(query: string): Promise<ImageCandidate[]> {
  const url = `https://www.googleapis.com/customsearch/v1?key=${KEYS.googleApiKey}&cx=${KEYS.googleSearchEngineId}&q=${encodeURIComponent(
    query
  )}&searchType=image&num=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google CSE HTTP ${res.status}`);
  const data = await res.json();
  return (data.items ?? []).map((it: any) => ({
    url: it.link,
    source: "google" as const,
    width: it.image?.width,
    height: it.image?.height,
    mimeType: it.mime,
    title: it.title,
  }));
}

async function searchTavily(query: string): Promise<ImageCandidate[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: KEYS.tavilyApiKey,
      query,
      search_depth: "advanced",
      include_images: true,
      max_results: 5,
    }),
  });
  if (!res.ok) throw new Error(`Tavily HTTP ${res.status}`);
  const data = await res.json();
  return (data.images ?? []).map((img: any) => ({
    url: typeof img === "string" ? img : img.url,
    source: "tavily" as const,
  }));
}

async function searchOpenFoodFacts(p: ProductAsset): Promise<ImageCandidate[]> {
  const term = encodeURIComponent(`${p.brand} ${p.name}`);
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${term}&search_simple=1&action=process&json=1&page_size=5`;
  const res = await fetch(url, { headers: { "User-Agent": "BlinkitAssetPipeline/1.0" } });
  if (!res.ok) throw new Error(`OFF HTTP ${res.status}`);
  const data = await res.json();
  return (data.products ?? [])
    .map((prod: any) => prod.image_front_url || prod.image_url || prod.image_small_url)
    .filter(Boolean)
    .map((u: string) => ({ url: u, source: "openfoodfacts" as const }));
}

async function searchWikimedia(query: string): Promise<ImageCandidate[]> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
    query
  )}&gsrlimit=5&prop=imageinfo&iiprop=url|mime|size`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikimedia HTTP ${res.status}`);
  const data = await res.json();
  const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
  return pages
    .map((pg: any) => pg.imageinfo?.[0])
    .filter(Boolean)
    .map((ii: any) => ({
      url: ii.url,
      source: "wikimedia" as const,
      width: ii.width,
      height: ii.height,
      mimeType: ii.mime,
    }));
}

async function searchPexels(query: string): Promise<ImageCandidate[]> {
  const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5`, {
    headers: { Authorization: KEYS.pexelsApiKey! },
  });
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);
  const data = await res.json();
  return (data.photos ?? []).map((ph: any) => ({
    url: ph.src?.large ?? ph.src?.original,
    source: "pexels" as const,
    width: ph.width,
    height: ph.height,
  }));
}

async function searchPixabay(query: string): Promise<ImageCandidate[]> {
  const url = `https://pixabay.com/api/?key=${KEYS.pixabayApiKey}&q=${encodeURIComponent(query)}&image_type=photo&per_page=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pixabay HTTP ${res.status}`);
  const data = await res.json();
  return (data.hits ?? []).map((h: any) => ({
    url: h.largeImageURL,
    source: "pixabay" as const,
    width: h.imageWidth,
    height: h.imageHeight,
  }));
}

async function searchUnsplash(query: string): Promise<ImageCandidate[]> {
  const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5`, {
    headers: { Authorization: `Client-ID ${KEYS.unsplashAccessKey}` },
  });
  if (!res.ok) throw new Error(`Unsplash HTTP ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map((r: any) => ({
    url: r.urls?.regular ?? r.urls?.raw,
    source: "unsplash" as const,
    width: r.width,
    height: r.height,
  }));
}