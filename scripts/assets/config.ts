/**
 * Product Asset Pipeline — Configuration
 *
 * Reads environment variables and exposes a single typed config object.
 * Providers are auto-disabled when their required env vars are missing,
 * so the pipeline always runs with whatever keys are available.
 */

import path from "path";
import type { PipelineConfig } from "./types";

/** Absolute paths used across the pipeline. */
export const PATHS = {
  root: process.cwd(),
  assets: path.join(process.cwd(), "scripts", "assets"),
  downloads: path.join(process.cwd(), "scripts", "assets", "downloads"),
  validated: path.join(process.cwd(), "scripts", "assets", "validated"),
  optimized: path.join(process.cwd(), "scripts", "assets", "optimized"),
  reports: path.join(process.cwd(), "scripts", "assets", "reports"),
  logs: path.join(process.cwd(), "scripts", "assets", "logs"),
  publicProducts: path.join(process.cwd(), "public", "images", "products"),
  catalog: path.join(process.cwd(), "src", "lib", "catalog.ts"),
} as const;

/** Gemini model identifiers. */
export const GEMINI_TEXT_MODEL = "gemini-2.5-flash";
export const GEMINI_VISION_MODEL = "gemini-2.5-flash";

/** Safe env accessor. */
function env(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

/** API keys loaded from .env (all optional — pipeline degrades gracefully). */
export const KEYS = {
  googleApiKey: env("GOOGLE_API_KEY"),
  googleCustomSearchKey: env("GOOGLE_CUSTOM_SEARCH_KEY"),
  googleSearchEngineId: env("GOOGLE_SEARCH_ENGINE_ID"),
  tavilyApiKey: env("TAVILY_API_KEY"),
  pexelsApiKey: env("PEXELS_API_KEY"),
  pixabayApiKey: env("PIXABAY_API_KEY"),
  unsplashAccessKey: env("UNSPLASH_ACCESS_KEY"),
};

/**
 * Build the runtime config. A provider is enabled only when its key(s)
 * are present, so a missing key never crashes the pipeline.
 */
export function loadConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  const providers = {
    google: Boolean(KEYS.googleApiKey && KEYS.googleCustomSearchKey && KEYS.googleSearchEngineId),
    tavily: Boolean(KEYS.tavilyApiKey),
    openfoodfacts: true, // free, no key required
    wikimedia: true, // free, no key required
    pexels: Boolean(KEYS.pexelsApiKey),
    pixabay: Boolean(KEYS.pixabayApiKey),
    unsplash: Boolean(KEYS.unsplashAccessKey),
  };

  return {
    providers,
    maxCandidates: 5,
    confidenceThreshold: 90,
    targetSize: 600,
    jpegQuality: 85,
    maxConcurrent: 3,
    retryAttempts: 4,
    backoffBaseMs: 800,
    ...overrides,
  };
}

/** Ordered list of provider keys by priority. */
export const PROVIDER_PRIORITY = [
  "google",
  "tavily",
  "openfoodfacts",
  "wikimedia",
  "pexels",
  "pixabay",
  "unsplash",
] as const;