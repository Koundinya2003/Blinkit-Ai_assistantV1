import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  type DocumentData
} from "firebase/firestore";
import { getDb } from "./index";
import type { Product, Category } from "../types";

const COLLECTION = "products";

function toProduct(doc: DocumentData): Product {
  const data = doc.data();
  return {
    id: doc.id,
    slug: data.slug ?? doc.id,
    name: data.name ?? "",
    brand: data.brand ?? "",
    category: data.category ?? "Snacks",
    subcategory: data.subcategory ?? "",
    unit: data.unit ?? "",
    price: Number(data.price ?? 0),
    mrp: Number(data.mrp ?? 0),
    discount: Number(data.discount ?? 0),
    stock: Number(data.stock ?? 0),
    rating: Number(data.rating ?? 0),
    reviewCount: Number(data.reviewCount ?? 0),
    reviews: Number(data.reviews ?? data.reviewCount ?? 0),
    deliveryMinutes: Number(data.deliveryMinutes ?? 15),
    description: data.description ?? "",
    image: data.image ?? "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    aiSignals: Array.isArray(data.aiSignals) ? data.aiSignals : []
  };
}

export async function getProducts(): Promise<Product[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const q = query(collection(db, COLLECTION), orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(toProduct);
  } catch {
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const q = query(collection(db, COLLECTION), where("slug", "==", slug), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return toProduct(snapshot.docs[0]);
  } catch {
    return null;
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return toProduct(snap);
  } catch {
    return null;
  }
}

export async function getProductsByCategory(category: Category): Promise<Product[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const q = query(collection(db, COLLECTION), where("category", "==", category), orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(toProduct);
  } catch {
    return [];
  }
}

export async function searchProducts(searchQuery: string): Promise<Product[]> {
  const db = getDb();
  if (!db) return [];
  const term = searchQuery.trim().toLowerCase();
  if (!term) return [];

  try {
    const q = query(collection(db, COLLECTION), orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(toProduct)
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.brand.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term) ||
          p.subcategory.toLowerCase().includes(term) ||
          p.tags.some((t) => t.toLowerCase().includes(term))
      );
  } catch {
    return [];
  }
}