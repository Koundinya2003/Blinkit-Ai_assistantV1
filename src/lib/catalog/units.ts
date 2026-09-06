import type { MeasureUnit } from "./types";

// "500 g", "1 L", "6 pcs", "M, 52 pcs" and multipacks like "3 x 20 g".
const MULTI_PATTERN = /(\d+)\s*[x×]\s*([\d.]+)\s*(kg|g|gm|l|ml)\b/i;
const PACK_PATTERN = /([\d.]+)\s*(kg|g|gm|grams?|l|ltr|litre|liter|ml|pcs?|pieces?|wipes|pack|packs|units?)\b/i;

/** Approximate weight of one piece, so "2 onions" can be priced from a 1 kg pack. */
const PIECE_WEIGHT_G: Record<string, number> = {
  onion: 100,
  tomato: 80,
  potato: 100,
  lemon: 50,
  egg: 50,
  capsicum: 110,
  carrot: 80,
  cucumber: 150,
  bread: 400,
  cauliflower: 500,
  cabbage: 700,
  mushroom: 15,
  "green-chilli": 5,
  garlic: 40,
  ginger: 30,
};

export function parsePack(pack: string): { size: number; unit: MeasureUnit } {
  const multi = MULTI_PATTERN.exec(pack);
  if (multi) {
    const total = Number.parseInt(multi[1], 10) * Number.parseFloat(multi[2]);
    return toBase(total, multi[3].toLowerCase());
  }

  const match = PACK_PATTERN.exec(pack);
  if (!match) return { size: 1, unit: "piece" };

  return toBase(Number.parseFloat(match[1]), match[2].toLowerCase());
}

function toBase(value: number, raw: string): { size: number; unit: MeasureUnit } {

  if (raw === "kg") return { size: value * 1000, unit: "g" };
  if (raw.startsWith("g")) return { size: value, unit: "g" };
  if (raw === "l" || raw.startsWith("lt") || raw.startsWith("li")) return { size: value * 1000, unit: "ml" };
  if (raw === "ml") return { size: value, unit: "ml" };
  return { size: value, unit: "piece" };
}

/** Renders a base-unit amount the way a shopper would read it. */
export function formatAmount(amount: number, unit: MeasureUnit): string {
  if (unit === "piece") {
    const rounded = Math.round(amount * 10) / 10;
    return `${rounded} ${rounded === 1 ? "pc" : "pcs"}`;
  }
  if (unit === "g") {
    return amount >= 1000 ? `${round(amount / 1000)} kg` : `${round(amount)} g`;
  }
  return amount >= 1000 ? `${round(amount / 1000)} L` : `${round(amount)} ml`;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Converts an amount between base units. Weight and volume are treated as
 * interchangeable at 1:1 (true enough for milk, oil and curd), and pieces
 * convert through a per-item weight table when we know one.
 */
export function convertAmount(
  amount: number,
  from: MeasureUnit,
  to: MeasureUnit,
  ingredientKey?: string
): number | null {
  if (from === to) return amount;

  const pieceWeight = ingredientKey ? PIECE_WEIGHT_G[ingredientKey] : undefined;

  if (from === "piece" && to !== "piece") {
    return pieceWeight ? amount * pieceWeight : null;
  }
  if (to === "piece" && from !== "piece") {
    return pieceWeight ? amount / pieceWeight : null;
  }
  // g <-> ml
  return amount;
}
