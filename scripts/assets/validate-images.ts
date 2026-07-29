/**
 * Product Asset Pipeline — Gemini Vision Validation (Phase 6) + Best Selection (Phase 7)
 *
 * For each downloaded candidate we ask Gemini Vision to score the image against
 * the product metadata. Anything below the confidence threshold is rejected.
 * The highest-scoring candidate wins. If none pass, we keep the placeholder.
 *
 * Gemini responses are cached on disk so re-runs don't re-spend quota.
 */

import fs from "fs";
import path from "path";
import type { DownloadedFile } from "./download-images";
import type { ProductAsset, ScoredCandidate, ValidationResult } from "./types";
import { GEMINI_VISION_MODEL, KEYS, PATHS } from "./config";
import { clamp, log, logError, readJsonCache, withRetry, writeJsonCache } from "./utils";

const VALIDATION_CACHE = path.join(PATHS.reports, "validation-cache.json");
type ValidationCache = Record<string, ValidationResult>;

/** Reject result written to reports/rejected.json. */
export interface RejectedProduct {
  id: string;
  slug: string;
  name: string;
  reason: string;
  bestScore: number | null;
}

/**
 * Validate every downloaded file for a product and return the best scorer.
 * Returns null when no candidate reaches the threshold (caller keeps placeholder).
 */
export async function validateProductImages(
  product: ProductAsset,
  files: DownloadedFile[],
  threshold: number
): Promise<{ best: ScoredCandidate | null; rejected: RejectedProduct | null }> {
  if (!files.length) {
    return {
      best: null,
      rejected: { id: product.id, slug: product.slug, name: product.name, reason: "No candidates downloaded", bestScore: null },
    };
  }

  const cache = readJsonCache<ValidationCache>(VALIDATION_CACHE) ?? {};
  const scored: ScoredCandidate[] = [];

  for (const file of files) {
    const cacheKey = `${product.id}:${path.basename(file.localPath)}:${file.bytes}`;
    let result = cache[cacheKey];

    if (!result) {
      try {
        result = await withRetry(
          () => geminiVisionValidate(product, file.localPath),
          3,
          1000,
          `validate:${product.slug}`
        );
        cache[cacheKey] = result;
        writeJsonCache(VALIDATION_CACHE, cache);
      } catch (err) {
        logError(`validation failed for ${product.slug} (${file.candidate.url})`, err);
        continue;
      }
    }

    scored.push({ candidate: file.candidate, validation: result, localPath: file.localPath });
  }

  if (!scored.length) {
    return {
      best: null,
      rejected: { id: product.id, slug: product.slug, name: product.name, reason: "All validations failed", bestScore: null },
    };
  }

  // Highest final score wins.
  scored.sort((a, b) => b.validation.finalScore - a.validation.finalScore);
  const best = scored[0];

  if (best.validation.finalScore < threshold || best.validation.confidence < threshold) {
    log(`  ${product.slug}: best score ${best.validation.finalScore} < ${threshold} → rejected`);
    return {
      best: null,
      rejected: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        reason: best.validation.reason,
        bestScore: best.validation.finalScore,
      },
    };
  }

  log(`  ${product.slug}: selected score ${best.validation.finalScore} (${best.candidate.source})`);
  return { best, rejected: null };
}

/* ------------------------------------------------------------------ */
/* Gemini Vision call                                                  */
/* ------------------------------------------------------------------ */

async function geminiVisionValidate(product: ProductAsset, imagePath: string): Promise<ValidationResult> {
  if (!KEYS.googleApiKey) {
    // No key — accept everything with a neutral score so the pipeline still
    // produces assets (useful for offline / free-provider runs).
    return neutralValidation();
  }

  const base64 = fs.readFileSync(imagePath).toString("base64");
  const mime = guessMime(imagePath);

  const prompt = `You are validating a product image for an Indian grocery catalog.
Given the product metadata and this image, decide if the image represents the
CORRECT retail product.

Product:
Name: ${product.name}
Brand: ${product.brand}
Category: ${product.category}
Subcategory: ${product.subcategory}
Unit: ${product.unit}
Description: ${product.description}

Return ONLY a JSON object (no markdown, no prose) with this exact shape:
{
  "confidence": <0-100 integer>,
  "reason": "<short string>",
  "imageQuality": <0-100 integer>,
  "packagingVisibility": <0-100 integer>,
  "brandVisibility": <0-100 integer>,
  "finalScore": <0-100 integer>
}
finalScore should weigh confidence, image quality, packaging and brand visibility.
Reject cartoons, AI art, wrong brands, or non-product photos with a low score.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent?key=${KEYS.googleApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: base64 } }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 200, responseMimeType: "application/json" },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini Vision HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return parseValidation(text);
}

function parseValidation(text: string): ValidationResult {
  try {
    const obj = JSON.parse(text);
    return {
      confidence: clamp(Math.round(Number(obj.confidence) || 0), 0, 100),
      reason: String(obj.reason ?? ""),
      imageQuality: clamp(Math.round(Number(obj.imageQuality) || 0), 0, 100),
      packagingVisibility: clamp(Math.round(Number(obj.packagingVisibility) || 0), 0, 100),
      brandVisibility: clamp(Math.round(Number(obj.brandVisibility) || 0), 0, 100),
      finalScore: clamp(Math.round(Number(obj.finalScore) || 0), 0, 100),
    };
  } catch {
    // Fallback: try to scrape numbers from free text.
    const nums = (text.match(/\d+/g) ?? []).map(Number);
    const score = nums[0] ?? 50;
    return {
      confidence: clamp(score, 0, 100),
      reason: text.slice(0, 120),
      imageQuality: 70,
      packagingVisibility: 70,
      brandVisibility: 70,
      finalScore: clamp(score, 0, 100),
    };
  }
}

function neutralValidation(): ValidationResult {
  return {
    confidence: 92,
    reason: "No Gemini key — auto-accepted candidate",
    imageQuality: 80,
    packagingVisibility: 80,
    brandVisibility: 80,
    finalScore: 92,
  };
}

function guessMime(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}