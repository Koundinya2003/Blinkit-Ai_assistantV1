/**
 * Product Asset Pipeline — Shared Utilities
 *
 * Retry with exponential backoff, simple disk caches, concurrency limiter,
 * logging, hashing and JSON helpers. Pure infrastructure — no business logic.
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { PATHS } from "./config";

/* ------------------------------------------------------------------ */
/* Logging                                                             */
/* ------------------------------------------------------------------ */

let _logStream: fs.WriteStream | null = null;

function logStream(): fs.WriteStream {
  if (!_logStream) {
    fs.mkdirSync(PATHS.logs, { recursive: true });
    _logStream = fs.createWriteStream(path.join(PATHS.logs, "pipeline.log"), { flags: "a" });
  }
  return _logStream;
}

export function log(message: string): void {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  try {
    logStream().write(line + "\n");
  } catch {
    /* ignore disk errors */
  }
}

export function logError(message: string, err?: unknown): void {
  const detail = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err ?? "");
  log(`ERROR: ${message}${detail ? `\n${detail}` : ""}`);
}

/* ------------------------------------------------------------------ */
/* Retry with exponential backoff                                      */
/* ------------------------------------------------------------------ */

export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 4,
  baseMs = 800,
  label = "operation"
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === attempts) break;
      const delay = baseMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
      log(`${label} failed (attempt ${attempt}/${attempts}); retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ */
/* Concurrency limiter                                                 */
/* ------------------------------------------------------------------ */

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => run());
  await Promise.all(workers);
  return results;
}

/* ------------------------------------------------------------------ */
/* Hashing & dedupe                                                    */
/* ------------------------------------------------------------------ */

export function hashUrl(url: string): string {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
}

export function hashBuffer(buf: Buffer): string {
  return crypto.createHash("sha1").update(buf).digest("hex").slice(0, 16);
}

/* ------------------------------------------------------------------ */
/* Disk cache (JSON)                                                   */
/* ------------------------------------------------------------------ */

export function readJsonCache<T>(file: string): T | null {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
    }
  } catch {
    /* corrupt cache — ignore */
  }
  return null;
}

export function writeJsonCache(file: string, data: unknown): void {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    logError("writeJsonCache failed", err);
  }
}

/* ------------------------------------------------------------------ */
/* Misc helpers                                                        */
/* ------------------------------------------------------------------ */

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function safeFilename(slug: string): string {
  return slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}