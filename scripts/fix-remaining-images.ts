#!/usr/bin/env node
/**
 * Fix remaining images after the main setup script.
 *
 * 1. Fix corrupted paths in seed-data.ts
 * 2. Download failed product images
 * 3. Download additional catalog.ts product images
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const ROOT = path.resolve(__dirname, "..");
const PRODUCTS_DIR = path.join(ROOT, "public/images/products");
const SEED_DATA_PATH = path.join(ROOT, "src/lib/seed-data.ts");
const CATALOG_PATH = path.join(ROOT, "src/lib/catalog.ts");

// Original URLs for failed downloads (from git history / known sources)
const failedProductUrls: Record<string, string> = {
  "cauliflower": "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca4?w=900&auto=format&fit=crop",
  "garlic": "https://images.unsplash.com/photo-1540148426945-6cf22a6b59f7?w=900&auto=format&fit=crop",
  "lemons": "https://images.unsplash.com/photo-1590502593747-42f89278ac74?w=900&auto=format&fit=crop",
  "watermelon": "https://images.unsplash.com/photo-1589984662742-a3baa1d2db5e?w=900&auto=format&fit=crop",
  "sweet-corn": "https://images.unsplash.com/photo-1551754659-6843a9a7d6f5?w=900&auto=format&fit=crop",
  "amul-curd": "https://images.unsplash.com/photo-1570824104453-5089ab5fb52a?w=900&auto=format&fit=crop",
};

// Additional products in catalog.ts that need images
const additionalCatalogProducts: Record<string, string> = {
  "britannia-good-day": "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=900&auto=format&fit=crop",
  "epigamia-greek-yogurt": "https://images.unsplash.com/photo-1570824104453-5089ab5fb52a?w=900&auto=format&fit=crop",
  "lays-classic": "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=900&auto=format&fit=crop",
  "maggi-bhuna-masala": "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=900&auto=format&fit=crop",
  "muscleblaze-whey": "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=900&auto=format&fit=crop",
  "red-bull": "https://images.unsplash.com/photo-1524459904749-45bf1f9a54a4?w=900&auto=format&fit=crop",
  "saffola-gold": "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=900&auto=format&fit=crop",
};

function downloadImage(url: string, dest: string): boolean {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) return true;
  try {
    execSync(`curl -sL --max-time 30 --retry 2 -o "${dest}" "${url}"`, {
      stdio: "pipe",
    });
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) return true;
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    return false;
  } catch {
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    return false;
  }
}

function fixCorruptedPaths() {
  console.log("Fixing corrupted paths in seed-data.ts...");
  let content = fs.readFileSync(SEED_DATA_PATH, "utf-8");

  // Fix the corrupted baby-care URLs that got partially replaced
  const corruptedPattern = /https:\/\/images\.unsplash\.com\/photo-1584515933487-779824d29309\?q=80\/images\/products\/himalaya-baby-wipes\.jpgw=900\/images\/products\/himalaya-baby-wipes\.jpgauto=format\/images\/products\/himalaya-baby-wipes\.jpgfit=crop/g;
  const correctPath = "/images/products/himalaya-baby-wipes.jpg";

  const matches = content.match(corruptedPattern);
  if (matches) {
    console.log(`  Found ${matches.length} corrupted baby-care URLs`);
    content = content.split(corruptedPattern).join(correctPath);
    fs.writeFileSync(SEED_DATA_PATH, content, "utf-8");
    console.log("  ✓ Fixed corrupted paths");
  } else {
    console.log("  No corrupted paths found (already fixed or not present)");
  }
}

function downloadFailedProducts() {
  console.log("\nDownloading failed product images...");
  let downloaded = 0;
  let failed = 0;

  for (const [slug, url] of Object.entries(failedProductUrls)) {
    const dest = path.join(PRODUCTS_DIR, `${slug}.jpg`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) {
      console.log(`  ✓ ${slug} (already exists)`);
      downloaded++;
      continue;
    }
    const ok = downloadImage(url, dest);
    if (ok) {
      console.log(`  ✓ ${slug}`);
      downloaded++;
    } else {
      console.log(`  ✗ ${slug}`);
      failed++;
    }
  }

  console.log(`  Downloaded: ${downloaded}, Failed: ${failed}`);
  return failed;
}

function downloadAdditionalCatalogProducts() {
  console.log("\nDownloading additional catalog.ts product images...");
  let downloaded = 0;
  let failed = 0;

  for (const [slug, url] of Object.entries(additionalCatalogProducts)) {
    const dest = path.join(PRODUCTS_DIR, `${slug}.jpg`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) {
      console.log(`  ✓ ${slug} (already exists)`);
      downloaded++;
      continue;
    }
    const ok = downloadImage(url, dest);
    if (ok) {
      console.log(`  ✓ ${slug}`);
      downloaded++;
    } else {
      console.log(`  ✗ ${slug}`);
      failed++;
    }
  }

  console.log(`  Downloaded: ${downloaded}, Failed: ${failed}`);
  return failed;
}

function verifyAllImages() {
  console.log("\nVerifying all product images...");

  // Check seed-data.ts
  const seedSlugs = new Set(
    fs
      .readFileSync(SEED_DATA_PATH, "utf-8")
      .match(/\/images\/products\/[^"]+/g) || []
  );

  // Check catalog.ts
  const catalogSlugs = new Set(
    fs
      .readFileSync(CATALOG_PATH, "utf-8")
      .match(/\/images\/products\/[^"]+/g) || []
  );

  const allSlugs = new Set([...seedSlugs, ...catalogSlugs]);
  let missing: string[] = [];

  for (const ref of allSlugs) {
    const slug = ref.replace("/images/products/", "");
    const dest = path.join(PRODUCTS_DIR, slug);
    if (!fs.existsSync(dest) || fs.statSync(dest).size <= 1024) {
      missing.push(slug);
    }
  }

  if (missing.length === 0) {
    console.log("  ✓ All product images present");
  } else {
    console.log(`  ✗ Missing ${missing.length} images:`);
    for (const m of missing) {
      console.log(`    - ${m}`);
    }
  }

  return missing.length === 0;
}

async function main(): Promise<void> {
  console.log("────────────────────────────────────────────────────────");
  console.log("  Fix Remaining Images");
  console.log("────────────────────────────────────────────────────────\n");

  fixCorruptedPaths();
  downloadFailedProducts();
  downloadAdditionalCatalogProducts();
  const allOk = verifyAllImages();

  console.log("\n────────────────────────────────────────────────────────");
  if (allOk) {
    console.log("  ✓ All images fixed!");
  } else {
    console.log("  ⚠ Some images still missing - see above");
  }
  console.log("────────────────────────────────────────────────────────");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
