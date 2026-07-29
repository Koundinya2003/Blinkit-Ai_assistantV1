import { products } from "../src/lib/catalog";
import fs from "fs";
import path from "path";

interface ImageReport {
  totalProducts: number;
  missingFiles: Array<{ id: string; slug: string; expectedPath: string }>;
  duplicateFiles: Array<{ filename: string; products: string[] }>;
  placeholderImages: string[];
  incorrectReferences: Array<{ id: string; slug: string; image: string; expected: string }>;
}

interface FixResult {
  productId: string;
  slug: string;
  oldImage: string;
  newImage: string;
  reason: string;
}

interface SkipResult {
  productId: string;
  slug: string;
  currentImage: string;
  reason: string;
}

// Load the image report
const reportPath = path.join(process.cwd(), "image-report.json");
if (!fs.existsSync(reportPath)) {
  console.error("❌ image-report.json not found. Run verify-images.ts first.");
  process.exit(1);
}

const report: ImageReport = JSON.parse(fs.readFileSync(reportPath, "utf-8"));

const fixes: FixResult[] = [];
const skipped: SkipResult[] = [];

// Process each incorrect reference
report.incorrectReferences.forEach(({ id, slug, image, expected }) => {
  const product = products.find(p => p.id === id);
  if (!product) {
    skipped.push({
      productId: id,
      slug: slug,
      currentImage: image,
      reason: "Product not found in catalog"
    });
    return;
  }

  // Check if the expected image file exists
  const expectedPath = path.join(process.cwd(), "public", expected);
  if (fs.existsSync(expectedPath)) {
    // The correct image exists, we can fix it
    fixes.push({
      productId: id,
      slug: slug,
      oldImage: image,
      newImage: expected,
      reason: "Correct image file exists"
    });
  } else {
    // The correct image doesn't exist - keep the current image
    // Do NOT assign a random or category image
    skipped.push({
      productId: id,
      slug: slug,
      currentImage: image,
      reason: `Expected image ${expected} does not exist - keeping current image`
    });
  }
});

// Process missing files
report.missingFiles.forEach(({ id, slug, expectedPath }) => {
  const product = products.find(p => p.id === id);
  if (!product) {
    skipped.push({
      productId: id,
      slug: slug,
      currentImage: expectedPath,
      reason: "Product not found in catalog"
    });
    return;
  }

  // Check if the expected image (based on slug) exists
  const expectedImage = `/images/products/${slug}.jpg`;
  const fullPath = path.join(process.cwd(), "public", expectedImage);
  
  if (fs.existsSync(fullPath)) {
    fixes.push({
      productId: id,
      slug: slug,
      oldImage: product.image,
      newImage: expectedImage,
      reason: "Missing file - correct image found"
    });
  } else {
    skipped.push({
      productId: id,
      slug: slug,
      currentImage: product.image,
      reason: `Missing file and no matching image exists for ${slug} - keeping placeholder`
    });
  }
});

// Generate the fix summary
console.log("\n=== IMAGE REPAIR REPORT ===");
console.log(`Total issues found: ${report.incorrectReferences.length + report.missingFiles.length}`);
console.log(`\nFixes applied: ${fixes.length}`);
if (fixes.length > 0) {
  fixes.slice(0, 20).forEach(({ productId, slug, oldImage, newImage, reason }) => {
    console.log(`  ✓ ${productId} (${slug})`);
    console.log(`    ${oldImage} → ${newImage}`);
    console.log(`    Reason: ${reason}`);
  });
  if (fixes.length > 20) {
    console.log(`  ... and ${fixes.length - 20} more`);
  }
}

console.log(`\nSkipped (no correct image available): ${skipped.length}`);
if (skipped.length > 0) {
  skipped.slice(0, 20).forEach(({ productId, slug, currentImage, reason }) => {
    console.log(`  ⚠ ${productId} (${slug})`);
    console.log(`    Current: ${currentImage}`);
    console.log(`    Reason: ${reason}`);
  });
  if (skipped.length > 20) {
    console.log(`  ... and ${skipped.length - 20} more`);
  }
}

// Output the fixes as a JSON file for review
const fixReportPath = path.join(process.cwd(), "image-fix-report.json");
const fixReport = {
  timestamp: new Date().toISOString(),
  totalIssues: report.incorrectReferences.length + report.missingFiles.length,
  fixesApplied: fixes.length,
  skippedCount: skipped.length,
  fixes,
  skipped
};
fs.writeFileSync(fixReportPath, JSON.stringify(fixReport, null, 2));
console.log(`\n✓ Fix report saved to: ${fixReportPath}`);

// Output the catalog.ts patch data
if (fixes.length > 0) {
  console.log("\n=== CATALOG PATCHES ===");
  console.log("Add these image overrides to catalog.ts:\n");
  fixes.forEach(({ productId, newImage }) => {
    console.log(`  "${productId}": "${newImage}",`);
  });
}
console.log("\n");