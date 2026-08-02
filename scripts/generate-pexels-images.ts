/**
 * Pexels Image Generation Pipeline
 *
 * This script:
 * 1. Reads every product from the local catalog
 * 2. Builds an intelligent search query for each product
 * 3. Searches the Pexels API for the best matching image
 * 4. Saves the original Pexels URL directly to Firestore
 * 5. Handles failures gracefully and respects API rate limits
 * 6. Generates IMAGE_IMPORT_REPORT.md
 *
 * Usage:
 *   Add PEXELS_API_KEY=your_key to .env or .env.local
 *   npx tsx scripts/generate-pexels-images.ts
 */

import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const REQUEST_DELAY_MS = 1000; // Delay between Pexels API requests
const MAX_RESULTS_PER_SEARCH = 30; // Pexels per_page

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  unit: string;
  image: string;
  tags: string[];
  [key: string]: unknown;
}

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

interface PexelsResponse {
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  total_results: number;
  next_page?: string;
}

interface ImportResult {
  productId: string;
  productName: string;
  category: string;
  searchQuery: string;
  status: "success" | "skipped" | "no_image" | "error";
  pexelsUrl?: string;
  pexelsPhotoId?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Credential Loading (reused from seed-firestore.ts)
// ---------------------------------------------------------------------------
function loadCredential(): { credential: ReturnType<typeof cert | typeof applicationDefault>; method: string } {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    const resolvedPath = path.resolve(credPath);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`GOOGLE_APPLICATION_CREDENTIALS points to a file that does not exist:\n  ${resolvedPath}`);
      process.exit(1);
    }
    let raw: string;
    try {
      raw = fs.readFileSync(resolvedPath, "utf-8");
    } catch {
      console.error(`Could not read credentials file at:\n  ${resolvedPath}`);
      process.exit(1);
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("GOOGLE_APPLICATION_CREDENTIALS file is not valid JSON.");
      process.exit(1);
    }
    const fileProjectId = parsed.project_id;
    if (typeof fileProjectId !== "string" || fileProjectId !== PROJECT_ID) {
      console.error(
        `Project mismatch!\n` +
        `  Credentials file project_id : ${fileProjectId ?? "(missing)"}\n` +
        `  Expected (NEXT_PUBLIC_FIREBASE_PROJECT_ID) : ${PROJECT_ID}\n`
      );
      process.exit(1);
    }
    return { credential: applicationDefault(), method: "GOOGLE_APPLICATION_CREDENTIALS" };
  }

  const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (keyJson) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(keyJson);
    } catch {
      console.error("FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON.");
      process.exit(1);
    }
    const envProjectId = parsed.project_id;
    if (typeof envProjectId !== "string" || envProjectId !== PROJECT_ID) {
      console.error(
        `Project mismatch!\n` +
        `  Credentials project_id : ${envProjectId ?? "(missing)"}\n` +
        `  Expected (NEXT_PUBLIC_FIREBASE_PROJECT_ID) : ${PROJECT_ID}\n`
      );
      process.exit(1);
    }
    return { credential: cert(parsed as Record<string, string>), method: "FIREBASE_SERVICE_ACCOUNT_KEY" };
  }

  console.error(
    "ERROR: No Firebase Admin credentials found.\n" +
    "Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_KEY."
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Search Query Builder
// ---------------------------------------------------------------------------
function buildSearchQuery(product: Product): string {
  const parts: string[] = [];

  // Add descriptive prefix based on category
  const category = product.category;
  const name = product.name;
  const brand = product.brand;

  // Build a natural, descriptive query
  // Examples: "Fresh Red Apples", "Organic Tomatoes", "Whole Wheat Bread"
  if (category === "Fruits & Vegetables") {
    // For produce, add "fresh" prefix
    parts.push("fresh");
  } else if (category === "Dairy & Breakfast") {
    // For dairy, add "fresh" or "pure" prefix
    parts.push("fresh");
  } else if (category === "Bakery") {
    // For bakery items, add "fresh baked"
    parts.push("fresh baked");
  } else if (category === "Snacks") {
    // For snacks, add "packaged"
    parts.push("packaged");
  } else if (category === "Beverages") {
    // For beverages, add "bottle" or "glass"
    parts.push("bottle");
  } else if (category === "Household") {
    // For household items, add "product"
    parts.push("product");
  } else if (category === "Personal Care") {
    // For personal care, add "product"
    parts.push("product");
  } else if (category === "Baby Care") {
    parts.push("baby product");
  } else if (category === "Instant Food") {
    parts.push("instant");
  } else if (category === "Staples") {
    parts.push("raw");
  }

  // Add brand if it's a known brand (not generic like "Fresho" or "Tata")
  const genericBrands = ["Fresho", "Tata", "Local", "Organic", "Fresh"];
  if (brand && !genericBrands.includes(brand)) {
    parts.push(brand.toLowerCase());
  }

  // Add product name (cleaned up)
  // Remove common suffixes like "Special Offer" etc.
  const cleanName = name
    .replace(/special offer/i, "")
    .replace(/\s+/g, " ")
    .trim();
  parts.push(cleanName.toLowerCase());

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Pexels API Search
// ---------------------------------------------------------------------------
async function searchPexels(query: string): Promise<PexelsPhoto[]> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${MAX_RESULTS_PER_SEARCH}&orientation=square`;

  const response = await fetch(url, {
    headers: {
      Authorization: PEXELS_API_KEY!,
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Pexels API rate limit exceeded. Please wait and try again.");
    }
    throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as PexelsResponse;
  return data.photos || [];
}

// ---------------------------------------------------------------------------
// Image Selection - Choose the best image from search results
// ---------------------------------------------------------------------------
function selectBestImage(photos: PexelsPhoto[], product: Product): PexelsPhoto | null {
  if (photos.length === 0) return null;

  // Score each photo based on selection criteria
  const scored = photos.map((photo) => {
    let score = 0;

    // Prefer high resolution
    if (photo.width >= 1000 && photo.height >= 1000) score += 30;
    else if (photo.width >= 800 && photo.height >= 800) score += 20;
    else if (photo.width >= 600 && photo.height >= 600) score += 10;

    // Prefer square or near-square images (better for product cards)
    const aspectRatio = photo.width / photo.height;
    if (aspectRatio >= 0.8 && aspectRatio <= 1.2) score += 25;
    else if (aspectRatio >= 0.7 && aspectRatio <= 1.3) score += 15;

    // Check alt text for relevance
    const altText = (photo.alt || "").toLowerCase();
    const productName = product.name.toLowerCase();
    const productWords = productName.split(" ").filter((w) => w.length > 2);

    // Score based on how many product words appear in alt text
    for (const word of productWords) {
      if (altText.includes(word)) score += 10;
    }

    // Penalize images that mention people, lifestyle, or advertisement
    const badKeywords = [
      "person", "people", "woman", "man", "girl", "boy", "child",
      "holding", "hand", "lifestyle", "model", "fashion",
      "collage", "multiple", "advertisement", "ad ",
    ];
    for (const bad of badKeywords) {
      if (altText.includes(bad)) score -= 15;
    }

    // Prefer images with "white background" or "isolated" in alt
    if (altText.includes("white") || altText.includes("isolated") || altText.includes("background")) {
      score += 15;
    }

    // Prefer images that mention the product category
    const category = product.category.toLowerCase();
    if (altText.includes(category) || altText.includes(category.split(" ")[0])) {
      score += 10;
    }

    return { photo, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return the best image if it has a positive score
  if (scored[0] && scored[0].score > 0) {
    return scored[0].photo;
  }

  // If no image has a positive score, return the first one as fallback
  // (only if there are results)
  return photos[0];
}

// ---------------------------------------------------------------------------
// Update Firestore
// ---------------------------------------------------------------------------
async function updateFirestore(
  db: ReturnType<typeof getFirestore>,
  productId: string,
  imageUrl: string
): Promise<void> {
  const ref = db.collection("products").doc(productId);
  await ref.update({ image: imageUrl });
}

// ---------------------------------------------------------------------------
// Delay helper
// ---------------------------------------------------------------------------
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main Pipeline
// ---------------------------------------------------------------------------
async function main() {
  console.log("====================================");
  console.log("Pexels Image Generation Pipeline");
  console.log("====================================\n");

  // Validate Pexels API key
  if (!PEXELS_API_KEY) {
    console.error("ERROR: PEXELS_API_KEY is not set.");
    console.error("Add it to .env or .env.local:");
    console.error("  PEXELS_API_KEY=your_pexels_api_key");
    process.exit(1);
  }

  if (!PROJECT_ID) {
    console.error("ERROR: NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set.");
    process.exit(1);
  }

  // Initialize Firebase Admin
  const { credential, method } = loadCredential();
  console.log(`Using credentials: ${method}`);
  console.log(`Project: ${PROJECT_ID}\n`);

  initializeApp({
    credential,
    projectId: PROJECT_ID,
  });

  const db = getFirestore();

  // Import products from catalog
  console.log("Loading products from catalog...");
  const { products } = await import("../src/lib/catalog");
  console.log(`Found ${products.length} products\n`);

  // Results tracking
  const results: ImportResult[] = [];
  let successCount = 0;
  let skippedCount = 0;
  let noImageCount = 0;
  let errorCount = 0;
  const apiErrors: string[] = [];
  const firestoreUpdates: string[] = [];
  const noImageProducts: string[] = [];

  // Process each product sequentially
  for (let i = 0; i < products.length; i++) {
    const product = products[i] as Product;
    const progress = `[${i + 1}/${products.length}]`;

    // Skip if product already has a non-empty image
    if (product.image && product.image.trim() !== "") {
      console.log(`${progress} SKIP: ${product.name} (already has image: ${product.image.substring(0, 50)}...)`);
      results.push({
        productId: product.id,
        productName: product.name,
        category: product.category,
        searchQuery: "",
        status: "skipped",
      });
      skippedCount++;
      continue;
    }

    // Build search query
    const searchQuery = buildSearchQuery(product);
    console.log(`${progress} Processing: ${product.name}`);
    console.log(`         Query: "${searchQuery}"`);

    try {
      // Search Pexels
      const photos = await searchPexels(searchQuery);

      if (photos.length === 0) {
        console.log(`         NO IMAGE: No results found`);
        results.push({
          productId: product.id,
          productName: product.name,
          category: product.category,
          searchQuery,
          status: "no_image",
        });
        noImageCount++;
        noImageProducts.push(product.name);
        continue;
      }

      // Select best image
      const bestPhoto = selectBestImage(photos, product);

      if (!bestPhoto) {
        console.log(`         NO IMAGE: No suitable image found`);
        results.push({
          productId: product.id,
          productName: product.name,
          category: product.category,
          searchQuery,
          status: "no_image",
        });
        noImageCount++;
        noImageProducts.push(product.name);
        continue;
      }

      console.log(`         Selected: Pexels photo #${bestPhoto.id} (${bestPhoto.width}x${bestPhoto.height})`);

      // Use the original Pexels URL (large2x for high quality)
      const pexelsUrl = bestPhoto.src.large2x || bestPhoto.src.large;
      console.log(`         Pexels URL: ${pexelsUrl.substring(0, 80)}...`);

      // Update Firestore with the Pexels URL directly
      await updateFirestore(db, product.id, pexelsUrl);
      console.log(`         Firestore updated: products/${product.id}`);

      results.push({
        productId: product.id,
        productName: product.name,
        category: product.category,
        searchQuery,
        status: "success",
        pexelsUrl,
        pexelsPhotoId: bestPhoto.id,
      });

      firestoreUpdates.push(`products/${product.id}`);
      successCount++;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`         ERROR: ${errorMsg}`);
      apiErrors.push(`${product.name}: ${errorMsg}`);

      results.push({
        productId: product.id,
        productName: product.name,
        category: product.category,
        searchQuery,
        status: "error",
        error: errorMsg,
      });
      errorCount++;
    }

    // Delay between requests to respect API limits
    if (i < products.length - 1) {
      await delay(REQUEST_DELAY_MS);
    }
  }

  // Generate report
  console.log("\n====================================");
  console.log("Pipeline Complete");
  console.log("====================================\n");

  generateReport(results, {
    total: products.length,
    success: successCount,
    skipped: skippedCount,
    noImage: noImageCount,
    errors: errorCount,
    apiErrors,
    firestoreUpdates,
    noImageProducts,
  });

  console.log(`\nSummary:`);
  console.log(`  Total products:    ${products.length}`);
  console.log(`  Successfully imported: ${successCount}`);
  console.log(`  Skipped (has image): ${skippedCount}`);
  console.log(`  No suitable image: ${noImageCount}`);
  console.log(`  Errors:            ${errorCount}`);
  console.log(`\nReport generated: IMAGE_IMPORT_REPORT.md`);

  process.exit(0);
}

// ---------------------------------------------------------------------------
// Report Generator
// ---------------------------------------------------------------------------
function generateReport(
  results: ImportResult[],
  stats: {
    total: number;
    success: number;
    skipped: number;
    noImage: number;
    errors: number;
    apiErrors: string[];
    firestoreUpdates: string[];
    noImageProducts: string[];
  }
): void {
  const report = `# Image Import Report

## Summary

| Metric | Count |
|--------|-------|
| Total products processed | ${stats.total} |
| Images successfully imported | ${stats.success} |
| Products skipped (already had image) | ${stats.skipped} |
| Products with no suitable image | ${stats.noImage} |
| Products with errors | ${stats.errors} |

---

## Firestore Documents Updated

The following Firestore documents were updated with Pexels image URLs:

\`\`\`
${stats.firestoreUpdates.length > 0 ? stats.firestoreUpdates.join("\n") : "(none)"}
\`\`\`

---

## Products with No Suitable Image

These products had no suitable image found on Pexels. Their \`image\` field remains \`""\`.

${stats.noImageProducts.length > 0 ? stats.noImageProducts.map((name) => `- ${name}`).join("\n") : "(none)"}

---

## API Errors Encountered

${stats.apiErrors.length > 0 ? stats.apiErrors.map((err) => `- ${err}`).join("\n") : "(none)"}

---

## Detailed Results

| # | Product | Category | Search Query | Status | Pexels URL |
|---|---------|----------|--------------|--------|------------|
${results.map((r, i) => `| ${i + 1} | ${r.productName} | ${r.category} | "${r.searchQuery}" | ${r.status} | ${r.pexelsUrl ? r.pexelsUrl.substring(0, 50) + "..." : "—"} |`).join("\n")}

---

## Pipeline Configuration

- **Image Source**: Pexels API (https://api.pexels.com/v1/search)
- **Firestore Collection**: \`products\`
- **Request Delay**: ${REQUEST_DELAY_MS}ms between API calls
- **Max Results per Search**: ${MAX_RESULTS_PER_SEARCH}
- **Image Quality**: \`large2x\` from Pexels (highest available)

---

## Current Image Pipeline

\`\`\`
Pexels API
    ↓
Best Image URL (original Pexels URL)
    ↓
Firestore (product.image field)
    ↓
Next.js UI (<Image src={product.image} />)
\`\`\`

Product images are stored directly as Pexels URLs in Firestore. No Firebase Storage involved.
`;

  fs.writeFileSync("IMAGE_IMPORT_REPORT.md", report, "utf-8");
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});