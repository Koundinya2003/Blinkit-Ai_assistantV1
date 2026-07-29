import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";

config({ path: ".env.local" });
config({ path: ".env" });

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!projectId) {
  console.error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID in environment.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Credential loading
// ---------------------------------------------------------------------------
function loadCredential(): { credential: ReturnType<typeof cert | typeof applicationDefault>; method: string } {
  // Method 1: GOOGLE_APPLICATION_CREDENTIALS pointing to a local JSON file
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    const resolvedPath = path.resolve(credPath);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`GOOGLE_APPLICATION_CREDENTIALS points to a file that does not exist:\n  ${resolvedPath}`);
      process.exit(1);
    }
    // Validate the file is valid JSON and matches the project
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
    if (typeof fileProjectId !== "string" || fileProjectId !== projectId) {
      console.error(
        `Project mismatch!\n` +
        `  Credentials file project_id : ${fileProjectId ?? "(missing)"}\n` +
        `  Expected (NEXT_PUBLIC_FIREBASE_PROJECT_ID) : ${projectId}\n` +
        `\n` +
        `Make sure the service account belongs to the Firebase project "${projectId}".`
      );
      process.exit(1);
    }
    return { credential: applicationDefault(), method: "GOOGLE_APPLICATION_CREDENTIALS" };
  }

  // Method 2: FIREBASE_SERVICE_ACCOUNT_KEY as a JSON string in an env var
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
    if (typeof envProjectId !== "string" || envProjectId !== projectId) {
      console.error(
        `Project mismatch!\n` +
        `  Credentials project_id : ${envProjectId ?? "(missing)"}\n` +
        `  Expected (NEXT_PUBLIC_FIREBASE_PROJECT_ID) : ${projectId}\n` +
        `\n` +
        `Make sure the service account belongs to the Firebase project "${projectId}".`
      );
      process.exit(1);
    }
    return { credential: cert(parsed as Record<string, string>), method: "FIREBASE_SERVICE_ACCOUNT_KEY" };
  }

  // Neither method available
  console.error(
    "ERROR:\n" +
    "No Firebase Admin credentials found.\n" +
    "\n" +
    "Please either:\n" +
    "\n" +
    "1. Set GOOGLE_APPLICATION_CREDENTIALS to your service-account.json\n" +
    "\n" +
    "OR\n" +
    "\n" +
    "2. Set FIREBASE_SERVICE_ACCOUNT_KEY to the JSON credentials."
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const { credential, method } = loadCredential();

  console.log("------------------------------------");
  console.log(`Using ${method}`);
  console.log("Connecting to Firestore...");
  console.log("------------------------------------");

  initializeApp({
    credential,
    projectId,
  });

  const db = getFirestore();

  // Quick connectivity check — list collections to verify the connection works
  const collections = await db.listCollections();
  const collectionIds = collections.map((c) => c.id);

  if (collectionIds.length === 0) {
    console.log("No existing collections found — they will be created during seeding.");
  } else {
    console.log(`Existing collections: ${collectionIds.join(", ")}`);
  }

  // ----------------------------------------------------------------
  // Import seed data
  // ----------------------------------------------------------------
  const { categories, products } = await import("../src/lib/seed-data");

  // ----------------------------------------------------------------
  // Seed categories
  // ----------------------------------------------------------------
  console.log("Seeding categories...");
  const categoriesCol = db.collection("categories");

  const categoryWrites = categories.map((cat) =>
    categoriesCol.doc(cat.id).set(cat, { merge: true })
  );
  await Promise.all(categoryWrites);
  console.log("✓ Categories complete");

  // ----------------------------------------------------------------
  // Seed products
  // ----------------------------------------------------------------
  console.log("Seeding products...");
  const productsCol = db.collection("products");

  const batchSize = 500;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = db.batch();
    const slice = products.slice(i, i + batchSize);

    slice.forEach((product) => {
      const ref = productsCol.doc(product.id);
      batch.set(ref, product, { merge: true });
    });

    await batch.commit();
    console.log(
      `  ... ${Math.min(i + batchSize, products.length)} / ${products.length} products`
    );
  }
  console.log("✓ Products complete");

  console.log("Finished.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});