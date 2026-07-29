#!/usr/bin/env node
/**
 * setup-local-images.ts
 *
 * Downloads all external images (Unsplash + Wikimedia) used in seed-data.ts
 * and catalog.ts into public/images/products/ and public/images/categories/.
 *
 * - Files are renamed using the product slug: <slug>.jpg
 * - Category files are renamed using the category id: <id>.jpg
 * - Both data files are rewritten to reference /images/products/<slug>.jpg
 *   and /images/categories/<id>.jpg
 * - Corrupted URLs in seed-data.ts are resolved using the corresponding
 *   (valid) URL from catalog.ts.
 * - Every other field is preserved.
 */

import { categories, products } from "../src/lib/seed-data";
import { products as catalogProducts } from "../src/lib/catalog";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// ─── Paths ────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");
const PRODUCTS_DIR = path.join(ROOT, "public/images/products");
const CATEGORIES_DIR = path.join(ROOT, "public/images/categories");
const SEED_DATA_PATH = path.join(ROOT, "src/lib/seed-data.ts");
const CATALOG_PATH = path.join(ROOT, "src/lib/catalog.ts");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isWellFormedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Build a map of slug → image URL from catalog.ts (preferred source because
 * its URLs are clean — seed-data.ts has several corrupted entries).
 */
const catalogBySlug = new Map<string, string>();
for (const p of catalogProducts) {
  catalogBySlug.set(p.slug, p.image);
}

/**
 * For a given product, return the best (well-formed) URL to download from.
 * Falls back to catalog.ts, then to a regex-extracted photo ID.
 */
function resolveUrl(slug: string, seedUrl: string): string | null {
  if (isWellFormedUrl(seedUrl)) return seedUrl;

  const catUrl = catalogBySlug.get(slug);
  if (catUrl && isWellFormedUrl(catUrl)) return catUrl;

  // Try to extract an Unsplash photo ID from the corrupted string
  const match = seedUrl.match(/photo-(\d+)/);
  if (match) {
    return `https://images.unsplash.com/photo-${match[1]}?w=900&auto=format&fit=crop`;
  }

  return null;
}

/**
 * Download an image from url to dest using curl.
 * Returns true on success (file exists and is > 1 KB).
 */
function downloadImage(url: string, dest: string): boolean {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) return true;
  try {
    execSync(`curl -sL --max-time 30 --retry 2 -o "${dest}" "${url}"`, {
      stdio: "pipe",
    });
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) return true;
    // File too small or doesn't exist — clean up
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    return false;
  } catch {
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Create directories
  fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
  fs.mkdirSync(CATEGORIES_DIR, { recursive: true });
  console.log("✓ Directories created");

  // ── 2. Download product images ──────────────────────────────────────────────
  const downloadedProducts: string[] = [];
  const failedProducts: { slug: string; url: string }[] = [];

  // Collect unique URLs → slugs mapping
  const urlToSlugs = new Map<string, string[]>();
  for (const p of products) {
    const resolved = resolveUrl(p.slug, p.image);
    if (!resolved) {
      failedProducts.push({ slug: p.slug, url: p.image });
      continue;
    }
    if (!urlToSlugs.has(resolved)) urlToSlugs.set(resolved, []);
    urlToSlugs.get(resolved)!.push(p.slug);
  }

  console.log(
    `\nDownloading ${urlToSlugs.size} unique product image(s) for ${products.length} products...`
  );

  for (const [url, slugs] of urlToSlugs) {
    // Download once to a temp file
    const ext = url.includes(".png") ? "png" : "jpg";
    const tmpFile = path.join(PRODUCTS_DIR, `__tmp_${Date.now()}.${ext}`);
    const ok = downloadImage(url, tmpFile);

    if (!ok) {
      console.log(`  ✗ Failed: ${url}`);
      for (const s of slugs) failedProducts.push({ slug: s, url });
      continue;
    }

    // Copy to each slug name
    for (const slug of slugs) {
      const dest = path.join(PRODUCTS_DIR, `${slug}.jpg`);
      fs.copyFileSync(tmpFile, dest);
      downloadedProducts.push(slug);
    }
    fs.unlinkSync(tmpFile);
    console.log(`  ✓ ${url} → ${slugs.length} file(s)`);
  }

  // ── 3. Download category images ─────────────────────────────────────────────
  const downloadedCategories: string[] = [];
  const failedCategories: { id: string; url: string }[] = [];

  for (const cat of categories) {
    const dest = path.join(CATEGORIES_DIR, `${cat.id}.jpg`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) {
      downloadedCategories.push(cat.id);
      continue;
    }
    const ok = downloadImage(cat.image, dest);
    if (ok) {
      downloadedCategories.push(cat.id);
      console.log(`  ✓ Category: ${cat.id}`);
    } else {
      failedCategories.push({ id: cat.id, url: cat.image });
      console.log(`  ✗ Category failed: ${cat.id}`);
    }
  }

  // ── 4. Rewrite seed-data.ts ─────────────────────────────────────────────────
  console.log("\nRewriting seed-data.ts...");
  let seedContent = fs.readFileSync(SEED_DATA_PATH, "utf-8");

  // Replace category images
  for (const cat of categories) {
    const oldUrl = cat.image;
    const newPath = `/images/categories/${cat.id}.jpg`;
    if (oldUrl !== newPath) {
      seedContent = seedContent.split(oldUrl).join(newPath);
    }
  }

  // Replace product images
  for (const p of products) {
    const oldUrl = p.image;
    const newPath = `/images/products/${p.slug}.jpg`;
    if (oldUrl !== newPath) {
      seedContent = seedContent.split(oldUrl).join(newPath);
    }
  }

  fs.writeFileSync(SEED_DATA_PATH, seedContent, "utf-8");
  console.log("✓ seed-data.ts updated");

  // ── 5. Rewrite catalog.ts ───────────────────────────────────────────────────
  console.log("Rewriting catalog.ts...");
  let catalogContent = fs.readFileSync(CATALOG_PATH, "utf-8");

  // Replace product images (use catalog URLs)
  for (const p of catalogProducts) {
    const oldUrl = p.image;
    const newPath = `/images/products/${p.slug}.jpg`;
    if (oldUrl !== newPath) {
      catalogContent = catalogContent.split(oldUrl).join(newPath);
    }
  }

  fs.writeFileSync(CATALOG_PATH, catalogContent, "utf-8");
  console.log("✓ catalog.ts updated");

  // ── 6. Summary ──────────────────────────────────────────────────────────────
  console.log("\n────────────────────────────────────────────────────────");
  console.log("  Image Pipeline Summary");
  console.log("────────────────────────────────────────────────────────");
  console.log(`Product images downloaded:  ${downloadedProducts.length}`);
  console.log(`Category images downloaded: ${downloadedCategories.length}`);
  console.log(`Failed products:            ${failedProducts.length}`);
  console.log(`Failed categories:          ${failedCategories.length}`);

  if (failedProducts.length > 0) {
    console.log("\n── Remaining missing product assets ──");
    for (const f of failedProducts) {
      console.log(`  ✗ ${f.slug}: ${f.url}`);
    }
  }

  if (failedCategories.length > 0) {
    console.log("\n── Remaining missing category assets ──");
    for (const f of failedCategories) {
      console.log(`  ✗ ${f.id}: ${f.url}`);
    }
  }

  console.log("────────────────────────────────────────────────────────");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
