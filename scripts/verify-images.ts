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

const report: ImageReport = {
  totalProducts: products.length,
  missingFiles: [],
  duplicateFiles: [],
  placeholderImages: [],
  incorrectReferences: []
};

// Check for placeholder images
const placeholderPatterns = ["placeholder", "default", "generic", "sample"];

// Map to track which products use which image files
const imageUsage = new Map<string, string[]>();

products.forEach(product => {
  const imagePath = product.image;
  const filename = path.basename(imagePath);
  const fullPath = path.join(process.cwd(), "public", imagePath);

  // Check for placeholder images
  if (placeholderPatterns.some(pattern => filename.toLowerCase().includes(pattern))) {
    report.placeholderImages.push(product.id);
  }

  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    report.missingFiles.push({
      id: product.id,
      slug: product.slug,
      expectedPath: imagePath
    });
  }

  // Track image usage
  if (!imageUsage.has(filename)) {
    imageUsage.set(filename, []);
  }
  imageUsage.get(filename)!.push(product.id);
});

// Find duplicate files (same image used by multiple products)
imageUsage.forEach((productIds, filename) => {
  if (productIds.length > 1) {
    report.duplicateFiles.push({
      filename,
      products: productIds
    });
  }
});

// Check for incorrect references (filename doesn't match slug)
products.forEach(product => {
  const imagePath = product.image;
  const filename = path.basename(imagePath);
  const expectedFilename = `${product.slug}.jpg`;
  
  // Check if the filename matches the product slug
  if (filename !== expectedFilename && !report.missingFiles.some(m => m.id === product.id)) {
    report.incorrectReferences.push({
      id: product.id,
      slug: product.slug,
      image: imagePath,
      expected: `/images/products/${expectedFilename}`
    });
  }
});

// Write report
const reportPath = path.join(process.cwd(), "image-report.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log("\n=== IMAGE AUDIT REPORT ===");
console.log(`Total products: ${report.totalProducts}`);
console.log(`\nMissing files: ${report.missingFiles.length}`);
if (report.missingFiles.length > 0) {
  report.missingFiles.slice(0, 10).forEach(({ id, slug }) => {
    console.log(`  ${id} (${slug})`);
  });
  if (report.missingFiles.length > 10) {
    console.log(`  ... and ${report.missingFiles.length - 10} more`);
  }
}
console.log(`\nDuplicate files: ${report.duplicateFiles.length}`);
if (report.duplicateFiles.length > 0) {
  report.duplicateFiles.slice(0, 10).forEach(({ filename, products }) => {
    console.log(`  ${filename}: ${products.length} products`);
  });
  if (report.duplicateFiles.length > 10) {
    console.log(`  ... and ${report.duplicateFiles.length - 10} more`);
  }
}
console.log(`\nPlaceholder images: ${report.placeholderImages.length}`);
if (report.placeholderImages.length > 0) {
  report.placeholderImages.forEach(id => {
    console.log(`  ${id}`);
  });
}
console.log(`\nIncorrect references: ${report.incorrectReferences.length}`);
if (report.incorrectReferences.length > 0) {
  report.incorrectReferences.slice(0, 10).forEach(({ id, slug, image, expected }) => {
    console.log(`  ${id} (${slug})`);
    console.log(`    Current: ${image}`);
    console.log(`    Expected: ${expected}`);
  });
  if (report.incorrectReferences.length > 10) {
    console.log(`  ... and ${report.incorrectReferences.length - 10} more`);
  }
}
console.log(`\n✓ Report saved to: ${reportPath}\n`);