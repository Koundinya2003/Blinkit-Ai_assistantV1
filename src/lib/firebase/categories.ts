import {
  collection,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  type DocumentData
} from "firebase/firestore";
import { getDb } from "./index";
import type { CategoryDoc } from "../types";

const COLLECTION = "categories";

function toCategory(doc: DocumentData): CategoryDoc {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name ?? "Snacks",
    icon: data.icon ?? "🛒",
    description: data.description ?? "",
    productCount: Number(data.productCount ?? 0),
    image: data.image ?? ""
  };
}

export async function getCategories(): Promise<CategoryDoc[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const q = query(collection(db, COLLECTION), orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(toCategory);
  } catch {
    return [];
  }
}

export async function getCategoryBySlug(slug: string): Promise<CategoryDoc | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const q = query(collection(db, COLLECTION), where("slug", "==", slug), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return toCategory(snapshot.docs[0]);
  } catch {
    return null;
  }
}