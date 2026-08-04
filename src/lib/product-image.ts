function getProductEmoji(name: string, slug: string): string {
  const haystack = `${name} ${slug}`.toLowerCase();

  if (/(mango|alphonso|orange|banana|apple|grape|papaya|pineapple|kiwi|guava|pear)/.test(haystack)) return "🍍";
  if (/(milk|lassi|curd|butter|cream|ghee|cheese|yogurt)/.test(haystack)) return "🥛";
  if (/(coffee|cappuccino|nescafe|latte|espresso)/.test(haystack)) return "☕";
  if (/(choco|chocolate|cookie|biscuit|candy|brownie)/.test(haystack)) return "🍫";
  if (/(salt|spice|pepper|turmeric|masala|chilli)/.test(haystack)) return "🧂";
  if (/(tea|chai|green tea)/.test(haystack)) return "🍵";
  if (/(bread|bun|cake|toast|roll)/.test(haystack)) return "🥖";
  if (/(rice|atta|wheat|flour|dal|poha|rava|maida|besan)/.test(haystack)) return "🌾";
  if (/(soap|detergent|cleaner|wash|care|hand)/.test(haystack)) return "🧼";
  if (/(diaper|baby|care|powder|oil)/.test(haystack)) return "🧴";
  if (/(water|juice|soft drink|soda|energy|drink)/.test(haystack)) return "🥤";
  if (/(snack|chips|namkeen|fry|nuts)/.test(haystack)) return "🥨";
  if (/(fruit|vegetable|tomato|onion|carrot|spinach|cucumber|potato|cauliflower)/.test(haystack)) return "🥬";

  return "🛒";
}

function buildProductArt(title: string, slug: string): string {
  const safeTitle = title.length > 34 ? `${title.slice(0, 31)}...` : title;
  const emoji = getProductEmoji(title, slug);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="${safeTitle}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f8fafc"/>
          <stop offset="100%" stop-color="#f3e8ff"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" rx="28" fill="url(#g)"/>
      <rect x="34" y="34" width="332" height="332" rx="24" fill="#ffffff" opacity="0.95"/>
      <circle cx="200" cy="138" r="68" fill="#e2e8f0"/>
      <text x="200" y="168" text-anchor="middle" font-size="86">${emoji}</text>
      <rect x="64" y="238" width="272" height="4" rx="2" fill="#cbd5e1"/>
      <text x="200" y="290" text-anchor="middle" font-size="24" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#0f172a">${safeTitle}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getProductImage(
  slug: string | null | undefined,
  image?: string | null,
  productName?: string | null
): string {
  const normalizedSlug = slug?.trim();
  if (!normalizedSlug) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
        <rect width="400" height="400" fill="#f8fafc" />
        <text x="200" y="200" text-anchor="middle" font-size="24" font-family="Arial" font-weight="700" fill="#0f172a">Product</text>
      </svg>
    `)}`;
  }

  const displayName = (productName?.trim() || normalizedSlug)
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

  return buildProductArt(displayName, normalizedSlug);
}