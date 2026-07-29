/**
 * Product Asset Pipeline — Catalog Update (Phase 9)
 *
 * Rewrites ONLY the `image` field of each product in src/lib/catalog.ts.
 * Pricing, description, ratings, tags, brand and category are never touched.
 *
 * The edit is done with a precise per-product regex that anchors on the
 * product's `id:` line and replaces the next `image:` occurrence, so we
 * never accidentally edit the wrong product or any other field.
 */

import fs from "fs";
import { PATHS } from "./config";
import { log, logError } from "./utils";

export interface CatalogUpdate {
  slug: string;
  oldImage: string;
  newImage: string;
  changed: boolean;
}

/**
 * Apply a map of slug → new image path to catalog.ts.
 * Only the `image` field is modified. Returns a per-product audit list.
 */
export function updateCatalogImages(updates: Map<string, string>): CatalogUpdate[] {
  const file = PATHS.catalog;
  let src = fs.readFileSync(file, "utf-8");
  const results: CatalogUpdate[] = [];

  // Build a slug → id lookup by scanning the file once.
  // Each product block starts with `{ id: "..."` and contains `slug: "..."`.
  const productBlocks = matchProductBlocks(src);

  for (const [slug, newImage] of updates) {
    const block = productBlocks.find((b) => b.slug === slug);
    if (!block) {
      logError(`updateCatalog: product block not found for slug ${slug}`);
      results.push({ slug, oldImage: "", newImage, changed: false });
      continue;
    }

    // Replace the image line that appears inside this product's block only.
    const imageRegex = new RegExp(
      `(${escapeRegex(block.idLine)}[\\s\\S]*?image:\\s*")([^"]*)(")`,
      "m"
    );
    const match = src.match(imageRegex);
    if (!match) {
      logError(`updateCatalog: image field not found for ${slug}`);
      results.push({ slug, oldImage: "", newImage, changed: false });
      continue;
    }

    const oldImage = match[2];
    if (oldImage === newImage) {
      results.push({ slug, oldImage, newImage, changed: false });
      continue;
    }

    src = src.replace(imageRegex, `$1${newImage}$3`);
    results.push({ slug, oldImage, newImage, changed: true });
    log(`  ${slug}: ${oldImage} → ${newImage}`);
  }

  if (results.some((r) => r.changed)) {
    fs.writeFileSync(file, src);
    log(`updateCatalog: wrote ${results.filter((r) => r.changed).length} changes to catalog.ts`);
  } else {
    log("updateCatalog: no changes required");
  }

  return results;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

interface ProductBlock {
  slug: string;
  idLine: string; // the `id: "..."` line text used as an anchor
}

/** Find every product object and capture its slug + id anchor line. */
function matchProductBlocks(src: string): ProductBlock[] {
  const blocks: ProductBlock[] = [];
  // Match `id: "xxx"` then lazely capture until `slug: "yyy"`.
  const re = /id:\s*"([^"]+)"[\s\S]*?slug:\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    // The anchor is the full `id: "..."` line.
    const idLineMatch = src.slice(0, m.index).match(/.*id:\s*"[^"]+".*$/);
    const idLine = idLineMatch ? idLineMatch[0] : `id: "${m[1]}"`;
    blocks.push({ slug: m[2], idLine });
  }
  return blocks;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}