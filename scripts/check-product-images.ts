import * as fs from "fs";
import * as path from "path";
import { products } from "../src/lib/catalog";

type CheckResult = {
  slug: string;
  name: string;
  found: boolean;
};

async function main() {
  const results: CheckResult[] = [];

  for (const product of products) {
    const imagePath = path.resolve("public/images/products", `${product.slug}.jpg`);
    const found = fs.existsSync(imagePath);
    results.push({ slug: product.slug, name: product.name, found });
  }

  for (const result of results) {
    if (result.found) {
      console.log(`✓ Found   ${result.slug}.jpg — ${result.name}`);
    } else {
      console.log(`✗ Missing ${result.slug}.jpg — ${result.name}`);
    }
  }

  const totalProducts = results.length;
  const imagesFound = results.filter((r) => r.found).length;
  const imagesMissing = results.filter((r) => !r.found).length;

  console.log("\n--------------------");
  console.log(`Total products:    ${totalProducts}`);
  console.log(`Images found:      ${imagesFound}`);
  console.log(`Images missing:    ${imagesMissing}`);
}

main().catch((err) => {
  console.error("Check failed:", err);
  process.exit(1);
});