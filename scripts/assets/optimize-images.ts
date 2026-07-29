/**
 * Product Asset Pipeline — Image Optimization (Phase 8)
 *
 * Takes the selected candidate and produces a web-ready asset:
 *   - 600x600 square
 *   - center-cropped
 *   - white background (flattened)
 *   - JPEG 85% quality
 *
 * Output: public/images/products/<slug>.jpg
 * Also copied to scripts/assets/optimized/<slug>.jpg for audit.
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";
import type { ScoredCandidate } from "./types";
import { PATHS } from "./config";
import { ensureDir, log, logError } from "./utils";

export interface OptimizeResult {
  slug: string;
  publicPath: string;
  bytes: number;
  width: number;
  height: number;
}

/**
 * Optimize the selected candidate into the final public asset.
 * Returns the public URL path (e.g. /images/products/amul-butter.jpg).
 */
export async function optimizeImage(
  slug: string,
  best: ScoredCandidate,
  targetSize: number,
  quality: number
): Promise<OptimizeResult> {
  ensureDir(PATHS.publicProducts);
  ensureDir(PATHS.optimized);

  const outFilename = `${slug}.jpg`;
  const publicPath = path.join(PATHS.publicProducts, outFilename);
  const auditPath = path.join(PATHS.optimized, outFilename);
  const publicUrl = `/images/products/${outFilename}`;

  try {
    await renderSquare(best.localPath, publicPath, targetSize, quality);
    // Keep an audit copy alongside the public asset.
    fs.copyFileSync(publicPath, auditPath);

    const stat = fs.statSync(publicPath);
    log(`  ${slug}: optimized ${stat.size} bytes → ${publicUrl}`);
    return { slug, publicPath: publicUrl, bytes: stat.size, width: targetSize, height: targetSize };
  } catch (err) {
    logError(`optimize failed for ${slug}`, err);
    throw err;
  }
}

/**
 * Render a source image as a centered square on white background.
 * Strategy: cover-fit into targetSize, then composite onto a white canvas.
 */
async function renderSquare(src: string, dest: string, size: number, quality: number): Promise<void> {
  const white = { r: 255, g: 255, b: 255, alpha: 1 };

  // Resize so the image fills the square (cover), then trim to exact size.
  const resized = await sharp(src)
    .resize(size, size, { fit: "cover", position: "centre", background: white })
    .flatten({ background: white })
    .jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:2:0" })
    .toBuffer();

  // Composite onto an explicit white canvas to guarantee a pure background
  // for transparent PNGs / odd aspect ratios.
  const canvas = await sharp({
    create: { width: size, height: size, channels: 3, background: white },
  })
    .jpeg({ quality })
    .toBuffer();

  await sharp(canvas)
    .composite([{ input: resized, top: 0, left: 0, blend: "over" }])
    .jpeg({ quality, mozjpeg: true })
    .toFile(dest);
}