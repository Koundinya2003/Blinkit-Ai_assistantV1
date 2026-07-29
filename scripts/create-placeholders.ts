#!/usr/bin/env node
/**
 * Create placeholder images for missing product images.
 * Uses Python/PIL to generate simple colored placeholder images.
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const ROOT = path.resolve(__dirname, "..");
const PRODUCTS_DIR = path.join(ROOT, "public/images/products");

const missingImages = [
  "cauliflower.jpg",
  "garlic.jpg",
  "lemons.jpg",
  "watermelon.jpg",
  "sweet-corn.jpg",
  "amul-curd.jpg",
  "epigamia-greek-yogurt.jpg",
  "red-bull.jpg",
];

// Simple 1x1 transparent PNG as base64
const placeholderPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

function createPlaceholder(filename: string): void {
  const dest = path.join(PRODUCTS_DIR, filename);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) {
    console.log(`  ✓ ${filename} (already exists)`);
    return;
  }

  // Try to use Python with PIL/Pillow to create a colored placeholder
  try {
    const script = `
import sys
try:
    from PIL import Image, ImageDraw, ImageFont
    img = Image.new('RGB', (400, 400), color='#f0f0f0')
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, 399, 399], outline='#ddd', width=2)
    img.save('${dest.replace(/\\/g, '\\\\')}', 'JPEG', quality=85)
    print('OK')
except ImportError:
    # Fallback: write a minimal valid JPEG
    with open('${dest.replace(/\\/g, '\\\\')}', 'wb') as f:
        f.write(b'\\xff\\xd8\\xff\\xe0\\x00\\x10JFIF\\x00\\x01\\x01\\x00\\x00\\x01\\x00\\x01\\x00\\xff\\xdb\\x00\\x43\\x00\\x08\\x06\\x06\\x07\\x06\\x05\\x08\\x07\\x06\\x07\\x07\\x07\\x09\\x09\\x08\\x0a\\x0c\\x14\\x0d\\x0c\\x0b\\x0b\\x0c\\x19\\x12\\x13\\x0f\\x14\\x1d\\x1a\\x1f\\x1e\\x1d\\x1a\\x1c\\x1c\\x20\\x24\\x2e\\x27\\x20\\x22\\x2c\\x23\\x1c\\x1c\\x28\\x37\\x29\\x2c\\x30\\x31\\x34\\x34\\x34\\x1f\\x27\\x39\\x3d\\x38\\x32\\x3c\\x2e\\x33\\x34\\x32\\xff\\xc0\\x00\\x0b\\x08\\x00\\x01\\x00\\x01\\x01\\x01\\x11\\x00\\xff\\xc4\\x00\\x14\\x00\\x01\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\xff\\xc4\\x00\\x14\\x10\\x01\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\xff\\xc4\\x00\\x14\\x00\\x01\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\xff\\xda\\x00\\x08\\x01\\x01\\x00\\x00\\x3f\\x00\\x7f\\xff\\xd9')
    print('FALLBACK')
`;
    const result = execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (result === "OK" || result === "FALLBACK") {
      if (fs.existsSync(dest) && fs.statSync(dest).size > 100) {
        console.log(`  ✓ ${filename} (placeholder created)`);
        return;
      }
    }
  } catch {
    // Python failed, try direct approach
  }

  // Final fallback: write a minimal JPEG directly
  try {
    fs.writeFileSync(dest, placeholderPng);
    console.log(`  ✓ ${filename} (minimal placeholder)`);
  } catch {
    console.log(`  ✗ ${filename} (failed to create placeholder)`);
  }
}

function main() {
  console.log("Creating placeholder images for missing assets...\n");
  for (const img of missingImages) {
    createPlaceholder(img);
  }
  console.log("\nDone.");
}

main();
