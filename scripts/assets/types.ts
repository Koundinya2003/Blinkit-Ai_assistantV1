/**
 * Product Asset Pipeline — Type Definitions
 *
 * Shared types used across every stage of the pipeline.
 * Keeping them in one place makes the modules small and consistent.
 */

/** Minimal product shape extracted from seed-data / catalog. */
export interface ProductAsset {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  unit: string;
  description: string;
  tags: string[];
}

/** A single image candidate returned by a search provider. */
export interface ImageCandidate {
  url: string;
  source: ImageSource;
  width?: number;
  height?: number;
  mimeType?: string;
  thumbnailUrl?: string;
  title?: string;
}

/** All supported image sources, ordered by priority. */
export type ImageSource =
  | "google"
  | "tavily"
  | "openfoodfacts"
  | "wikimedia"
  | "pexels"
  | "pixabay"
  | "unsplash";

/** Result of Gemini Vision validation for one image. */
export interface ValidationResult {
  confidence: number; // 0-100
  reason: string;
  imageQuality: number; // 0-100
  packagingVisibility: number; // 0-100
  brandVisibility: number; // 0-100
  finalScore: number; // 0-100
}

/** A candidate plus its validation result and local file path. */
export interface ScoredCandidate {
  candidate: ImageCandidate;
  validation: ValidationResult;
  localPath: string;
}

/** Per-product pipeline record persisted to reports. */
export interface ProductReport {
  id: string;
  slug: string;
  name: string;
  brand: string;
  query: string;
  candidatesFound: number;
  candidatesDownloaded: number;
  bestScore: number | null;
  bestSource: ImageSource | null;
  bestUrl: string | null;
  selected: boolean;
  rejected: boolean;
  reason: string;
  finalImage: string;
}

/** Final aggregate report written to reports/final-report.json. */
export interface FinalReport {
  generatedAt: string;
  productsProcessed: number;
  imagesDownloaded: number;
  imagesRejected: number;
  imagesSelected: number;
  averageConfidence: number;
  missingProducts: string[];
  duplicateProducts: string[];
  placeholderCount: number;
  sourceDistribution: Record<string, number>;
  products: ProductReport[];
}

/** Provider enable flags + runtime knobs. */
export interface PipelineConfig {
  providers: {
    google: boolean;
    tavily: boolean;
    openfoodfacts: boolean;
    wikimedia: boolean;
    pexels: boolean;
    pixabay: boolean;
    unsplash: boolean;
  };
  maxCandidates: number;
  confidenceThreshold: number;
  targetSize: number;
  jpegQuality: number;
  maxConcurrent: number;
  retryAttempts: number;
  backoffBaseMs: number;
}