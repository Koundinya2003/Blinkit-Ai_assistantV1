import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  type DocumentData
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { Review } from "./types";

const COLLECTION = "reviews";

function toReview(doc: DocumentData): Review {
  const data = doc.data();
  return {
    id: doc.id,
    productId: data.productId ?? "",
    userId: data.userId ?? "",
    rating: Number(data.rating ?? 0),
    title: data.title ?? "",
    body: data.body ?? "",
    verifiedPurchase: Boolean(data.verifiedPurchase ?? false),
    pros: Array.isArray(data.pros) ? data.pros : [],
    cons: Array.isArray(data.cons) ? data.cons : [],
    helpfulVotes: Number(data.helpfulVotes ?? 0),
    createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt ?? Date.now())
  };
}

export async function getReviewsByProductId(productId: string): Promise<Review[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const q = query(
      collection(db, COLLECTION),
      where("productId", "==", productId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(toReview);
  } catch {
    return [];
  }
}

export async function getReviewsByProductIdSorted(
  productId: string,
  sortBy: "latest" | "rating" | "helpful" = "latest"
): Promise<Review[]> {
  const db = getDb();
  if (!db) return [];
  try {
    let orderField: string;
    let orderDirection: "asc" | "desc" = "desc";

    switch (sortBy) {
      case "rating":
        orderField = "rating";
        orderDirection = "desc";
        break;
      case "helpful":
        orderField = "helpfulVotes";
        orderDirection = "desc";
        break;
      case "latest":
      default:
        orderField = "createdAt";
        orderDirection = "desc";
        break;
    }

    const q = query(
      collection(db, COLLECTION),
      where("productId", "==", productId),
      orderBy(orderField, orderDirection)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(toReview);
  } catch {
    return [];
  }
}