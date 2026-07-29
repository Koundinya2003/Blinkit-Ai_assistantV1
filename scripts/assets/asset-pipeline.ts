/**
 * Product Asset Pipeline — Orchestrator (Phases 1–10)
 *
 * Wires every stage together:
 *   1. Read products from src/lib/seed-data.ts
 *   2. Generate Gemini search queries
 *   3. Search multiple image sources
 *   4. Download candidates
 *   5. Validate with Gemini Vision
 *   6. Select best image
 *   7. Optimize to 600x600 JPEG
 *   8. Update catalog.ts (image field only)
 *   9. Generate final report
 *
 * Run with:  npm run assets
 */

import "dotenv/config";
import fs from "fs";
import path from "path";

import { products as seedProducts } from "../../src/lib/seed-data";
import { loadConfig, PATHS } from "./config";
import type {
  FinalReport,
  ImageSource,
  ProductAsset,
  ProductReport,
} from "./types";
import {
  ensureDir,
  log,
  logError,
  mapWithConcurrency,
  writeJsonCache,
} from "./utils";
import { generateSearchQueries, searchAllProducts } from "./search-images";
import { downloadProductImages, resetDownloadCache } from "./download-images";
import { validateProductImages, type RejectedProduct } from "./validate-images";
import { optimizeImage } from "./optimize-images";
import { updateCatalogImages } from "./update-catalog";

/* ------------------------------------------------------------------ */
/* Phase 2 — Read product data                                         */
/* ------------------------------------------------------------------ */

function readProducts(): ProductAsset[] {
  const seen = new Set<string>();
  const out: ProductAsset[] = [];
  for (const p of seedProducts) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      category: p.category,
      subcategory: p.subcategory,
      unit: p.unit,
      description: p.description,
      tags: p.tags,
    });
  }
  log(`Loaded ${out.length} products from seed-data.`);
  return out;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export async function runPipeline(): Promise<FinalReport> {
  const startedAt = Date.now();
  const config = loadConfig();

  ensureDir(PATHS.reports);
  ensureDir(PATHS.downloads);
  ensureDir(PATHS.validated);
  ensureDir(PATHS.optimized);
  ensureDir(PATHS.logs);
  ensureDir(PATHS.publicProducts);

  log("=== Product Asset Pipeline starting ===");
  log(
    `Providers enabled: ${Object.entries(config.providers)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ") || "(none)"}`
  );

  const products = readProducts();
  resetDownloadCache();

  // Phase 3 — search queries
  const queries = await generateSearchQueries(products);

  // Phase 4 — image search
  const candidates = await searchAllProducts(
    products,
    queries,
    config.providers as Partial<Record<ImageSource, boolean>>,
    config.maxCandidates
  );

  // Phases 5–8 per product (concurrency-limited)
  const reports: ProductReport[] = [];
  const rejected: RejectedProduct[] = [];
  const catalogUpdates = new Map<string, string>();
  const sourceDist: Record<string, number> = {};
  let imagesDownloaded = 0;
  let imagesSelected = 0;
  let imagesRejected = 0;
  let confidenceSum = 0;
  let confidenceCount = 0;

  await mapWithConcurrency(products, config.maxConcurrent, async (product) => {
    const report: ProductReport = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      query: queries[product.id] ?? "",
      candidatesFound: 0,
      candidatesDownloaded: 0,
      bestScore: null,
      bestSource: null,
      bestUrl: null,
      selected: false,
      rejected: false,
      reason: "",
      finalImage: "",
    };

    try {
      const cands = candidates[product.id] ?? [];
      report.candidatesFound = cands.length;

      // Phase 5 — download
      const files = await downloadProductImages(product, cands);
      report.candidatesDownloaded = files.length;
      imagesDownloaded += files.length;

      // Phase 6 + 7 — validate & select
      const { best, rejected: rej } = await validateProductImages(
        product,
        files,
        config.confidenceThreshold
      );

      if (rej) {
        rejected.push(rej);
        report.rejected = true;
        report.reason = rej.reason;
        report.bestScore = rej.bestScore;
        imagesRejected++;
      }

      if (best) {
        // Phase 8 — optimize
        const opt = await optimizeImage(
          product.slug,
          best,
          config.targetSize,
          config.jpegQuality
        );
        report.selected = true;
        report.bestScore = best.validation.finalScore;
        report.bestSource = best.candidate.source;
        report.bestUrl = best.candidate.url;
        report.finalImage = opt.publicPath;
        imagesSelected++;
        confidenceSum += best.validation.finalScore;
        confidenceCount++;
        sourceDist[best.candidate.source] = (sourceDist[best.candidate.source] ?? 0) + 1;
        catalogUpdates.set(product.slug, opt.publicPath);
      }
    } catch (err) {
      logError(`pipeline error for ${product.slug}`, err);
      report.rejected = true;
      report.reason = err instanceof Error ? err.message : "pipeline error";
      imagesRejected++;
    }

    reports.push(report);
    writeJsonCache(path.join(PATHS.reports, "progress.json"), { done: reports.length, total: products.length });
  });

  // Phase 9 — update catalog
  const catalogChanges = updateCatalogImages(catalogUpdates);
  log(`Catalog updated: ${catalogChanges.filter((c) => c.changed).length} images changed.`);

  // Write rejected report
  writeJsonCache(path.join(PATHS.reports, "rejected.json"), rejected);

  // Detect duplicates (same final image used by multiple products)
  const imageCounts = new Map<string, string[]>();
  for (const r of reports) {
    if (r.finalImage) {
      const arr = imageCounts.get(r.finalImage) ?? [];
      arr.push(r.slug);
      imageCounts.set(r.finalImage, arr);
    }
  }
  const duplicateProducts = Array.from(imageCounts.entries())
    .filter(([, slugs]) => slugs.length > 1)
    .flatMap(([, slugs]) => slugs);

  // Missing products = no candidates found at all
  const missingProducts = reports
    .filter((r) => r.candidatesFound === 0)
    .map((r) => r.slug);

  // Placeholder count = products not selected
  const placeholderCount = reports.filter((r) => !r.selected).length;

  // Phase 10 — final report
  const finalReport: FinalReport = {
    generatedAt: new Date().toISOString(),
    productsProcessed: products.length,
    imagesDownloaded,
    imagesRejected,
    imagesSelected,
    averageConfidence: confidenceCount
      ? Math.round((confidenceSum / confidenceCount) * 100) / 100
      : 0,
    missingProducts,
    duplicateProducts,
    placeholderCount,
    sourceDistribution: sourceDist,
    products: reports,
  };

  writeJsonCache(path.join(PATHS.reports, "final-report.json"), finalReport);

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  log(`=== Pipeline complete in ${elapsed}s ===`);
  log(
    `Processed: ${finalReport.productsProcessed} | Selected: ${finalReport.imagesSelected} | Rejected: ${finalReport.imagesRejected} | Avg confidence: ${finalReport.averageConfidence}`
  );
  log(`Report: ${path.join(PATHS.reports, "final-report.json")}`);

  return finalReport;
}

/* ------------------------------------------------------------------ */
/* CLI entrypoint                                                      */
/* ------------------------------------------------------------------ */

if (require.main === module) {
  runPipeline().catch((err) => {
    logError("Pipeline fatal error", err);
    process.exit(1);
  });
}