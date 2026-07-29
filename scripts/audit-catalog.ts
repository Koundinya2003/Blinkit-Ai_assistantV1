import { products, categories } from "../src/lib/catalog";
import fs from "fs";
import path from "path";

interface AuditReport {
  totalProducts: number;
  missingFields: Array<{ id: string; field: string; value: any }>;
  duplicateSlugs: string[];
  duplicateIds: string[];
  invalidCategories: Array<{ id: string; category: string }>;
  missingImages: string[];
  orphanProducts: string[];
  validProducts: number;
}

const report: AuditReport = {
  totalProducts: products.length,
  missingFields: [],
  duplicateSlugs: [],
  duplicateIds: [],
  invalidCategories: [],
  missingImages: [],
  orphanProducts: [],
  validProducts: 0
};

// Check for duplicate IDs
const idCount = new Map<string, number>();
products.forEach(p => {
  idCount.set(p.id, (idCount.get(p.id) || 0) + 1);
});
report.duplicateIds = Array.from(idCount.entries())
  .filter(([_, count]) => count > 1)
  .map(([id, _]) => id);

// Check for duplicate slugs
const slugCount = new Map<string, number>();
products.forEach(p => {
  slugCount.set(p.slug, (slugCount.get(p.slug) || 0) + 1);
});
report.duplicateSlugs = Array.from(slugCount.entries())
  .filter(([_, count]) => count > 1)
  .map(([slug, _]) => slug);

// Valid category names
const validCategoryNames = new Set(categories.map(c => c.name));

// Validate each product
products.forEach(product => {
  let hasIssues = false;

  // Check required fields
  const requiredFields = [
    { field: "id", value: product.id },
    { field: "slug", value: product.slug },
    { field: "name", value: product.name },
    { field: "brand", value: product.brand },
    { field: "category", value: product.category },
    { field: "subcategory", value: product.subcategory },
    { field: "image", value: product.image },
    { field: "price", value: product.price },
    { field: "mrp", value: product.mrp },
    { field: "rating", value: product.rating },
    { field: "reviews", value: product.reviews },
    { field: "deliveryMinutes", value: product.deliveryMinutes }
  ];

  requiredFields.forEach(({ field, value }) => {
    if (!value || (typeof value === "string" && value.trim() === "")) {
      report.missingFields.push({ id: product.id, field, value });
      hasIssues = true;
    }
  });

  // Check category validity
  if (!validCategoryNames.has(product.category)) {
    report.invalidCategories.push({ id: product.id, category: product.category });
    hasIssues = true;
  }

  // Check if image exists
  const imagePath = path.join(process.cwd(), "public", product.image);
  if (!fs.existsSync(imagePath)) {
    report.missingImages.push(product.id);
    hasIssues = true;
  }

  if (!hasIssues) {
    report.validProducts++;
  }
});

// Check for orphan products (products not matching any category)
report.orphanProducts = products
  .filter(p => !validCategoryNames.has(p.category))
  .map(p => p.id);

// Write report
const reportPath = path.join(process.cwd(), "audit-report.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log("\n=== CATALOG AUDIT REPORT ===");
console.log(`Total products: ${report.totalProducts}`);
console.log(`Valid products: ${report.validProducts}`);
console.log(`Products with issues: ${report.totalProducts - report.validProducts}`);
console.log(`\nDuplicate IDs: ${report.duplicateIds.length}`);
if (report.duplicateIds.length > 0) {
  console.log("  ", report.duplicateIds.join(", "));
}
console.log(`\nDuplicate slugs: ${report.duplicateSlugs.length}`);
if (report.duplicateSlugs.length > 0) {
  console.log("  ", report.duplicateSlugs.join(", "));
}
console.log(`\nMissing fields: ${report.missingFields.length}`);
if (report.missingFields.length > 0) {
  report.missingFields.slice(0, 5).forEach(({ id, field }) => {
    console.log(`  ${id}: missing ${field}`);
  });
  if (report.missingFields.length > 5) {
    console.log(`  ... and ${report.missingFields.length - 5} more`);
  }
}
console.log(`\nInvalid categories: ${report.invalidCategories.length}`);
if (report.invalidCategories.length > 0) {
  report.invalidCategories.slice(0, 5).forEach(({ id, category }) => {
    console.log(`  ${id}: "${category}"`);
  });
}
console.log(`\nMissing images: ${report.missingImages.length}`);
if (report.missingImages.length > 0) {
  report.missingImages.slice(0, 5).forEach(id => {
    console.log(`  ${id}`);
  });
  if (report.missingImages.length > 5) {
    console.log(`  ... and ${report.missingImages.length - 5} more`);
  }
}
console.log(`\nOrphan products: ${report.orphanProducts.length}`);
if (report.orphanProducts.length > 0) {
  report.orphanProducts.slice(0, 5).forEach(id => {
    console.log(`  ${id}`);
  });
}
console.log(`\n✓ Report saved to: ${reportPath}\n`);