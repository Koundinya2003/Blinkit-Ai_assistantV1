/**
 * Product Asset Pipeline — Image Download (Phase 5)
 *
 * Downloads every candidate for every product into
 *   scripts/assets/downloads/<slug>/candidate1.jpg … candidate5.jpg
 *
 * - Retries failed downloads with exponential backoff.
 * - Skips duplicates (same URL or same content hash) across the whole run.
 * - Caches already-downloaded files so re-runs are cheap.
 */

import fs from "fs";
import path from "path";
import type { ImageCandidate, ProductAsset } from "./types";
import { PATHS } from "./config";
import { ensureDir, hashBuffer, log, logError, withRetry } from "./utils";

export interface DownloadedFile {
  candidate: ImageCandidate;
  localPath: string;
  bytes: number;
}

/** Global dedupe maps keyed across the entire pipeline run. */
const downloadedUrls = new Set<string>();
const contentHashes = new Set<string>();

/**
 * Download all candidates for one product.
 * Returns the files that were successfully stored (in candidate order).
 */
export async function downloadProductImages(
  product: ProductAsset,
  candidates: ImageCandidate[]
): Promise<DownloadedFile[]> {
  const dir = path.join(PATHS.downloads, product.slug);
  ensureDir(dir);

  const files: DownloadedFile[] = [];
  let index = 0;

  for (const candidate of candidates) {
    index++;
    if (index > 5) break; // hard cap at 5 candidates
    const filename = `candidate${index}.jpg`;
    const localPath = path.join(dir, filename);

    try {
      const bytes = await downloadOne(candidate, localPath, product.slug);
      if (bytes > 0) {
        files.push({ candidate, localPath, bytes });
      }
    } catch (err) {
      logError(`download failed: ${product.slug} candidate${index} (${candidate.url})`, err);
    }
  }

  // Remove stale candidate files beyond what we actually downloaded.
  for (let i = files.length + 1; i <= 5; i++) {
    const stale = path.join(dir, `candidate${i}.jpg`);
    if (fs.existsSync(stale)) fs.unlinkSync(stale);
  }

  return files;
}

/** Download a single candidate with retry, dedupe and cache. */
async function downloadOne(
  candidate: ImageCandidate,
  localPath: string,
  slug: string
): Promise<number> {
  // Cache: if file already exists and is non-trivial, reuse it.
  if (fs.existsSync(localPath)) {
    const stat = fs.statSync(localPath);
    if (stat.size > 1024) {
      const buf = fs.readFileSync(localPath);
      const ch = hashBuffer(buf);
      contentHashes.add(ch);
      downloadedUrls.add(candidate.url);
      return stat.size;
    }
  }

  // Dedupe by URL across the whole run.
  if (downloadedUrls.has(candidate.url)) {
    log(`  ${slug}: skip duplicate URL`);
    return 0;
  }

  const buf = await withRetry(() => fetchImage(candidate.url), 3, 800, `download:${slug}`);
  if (!buf || buf.length < 1024) {
    log(`  ${slug}: too small / empty (${candidate.url})`);
    return 0;
  }

  // Dedupe by content hash across the whole run.
  const ch = hashBuffer(buf);
  if (contentHashes.has(ch)) {
    log(`  ${slug}: skip duplicate content`);
    return 0;
  }

  fs.writeFileSync(localPath, buf);
  downloadedUrls.add(candidate.url);
  contentHashes.add(ch);
  return buf.length;
}

/** Fetch raw image bytes with a browser-like UA and size guard. */
async function fetchImage(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/") && !ct.includes("octet-stream")) {
      throw new Error(`Not an image (content-type: ${ct})`);
    }

    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } finally {
    clearTimeout(timeout);
  }
}

/** Reset global dedupe state (used by orchestrator between full rebuilds). */
export function resetDownloadCache(): void {
  downloadedUrls.clear();
  contentHashes.clear();
}