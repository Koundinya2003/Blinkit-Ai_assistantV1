import type { Product } from "@/lib/catalog";

const EMOJI_RULES: [RegExp, string][] = [
  // Ordered most-specific first: "coriander leaves" is produce, "coriander
  // powder" is a spice, and both contain the word "coriander".
  [/coriander lea|curry lea|mint|pudina|spinach|palak|methi lea/i, "🥬"],
  [/chicken|mutton|keema|drumstick|salami|sausage/i, "🍗"],
  [/fish|prawn|basa|rohu/i, "🐟"],
  [/egg/i, "🥚"],
  [/paneer|cheese|mozzarella/i, "🧀"],
  [/curd|dahi|yogurt|lassi|chaas|buttermilk|shrikhand/i, "🥣"],
  [/milk|mawa|condensed/i, "🥛"],
  [/butter|ghee|cream/i, "🧈"],
  [/bread|pav|bun|croissant|rusk|tortilla|pizza base/i, "🍞"],
  [/oil$|cooking oil|sunflower oil|mustard oil|olive oil|refined oil|gold oil/i, "🍶"],
  [/rice|basmati|poha|rava|atta|flour|maida|vermicelli|sabudana/i, "🌾"],
  [/dal|chana|rajma|soya|pulse/i, "🫘"],
  [/cashew|almond|raisin|peanut|walnut|pistachio/i, "🥜"],
  [/tomato/i, "🍅"],
  [/onion|garlic/i, "🧅"],
  [/potato/i, "🥔"],
  [/carrot/i, "🥕"],
  [/green chilli|capsicum|bell pepper|chilli/i, "🌶️"],
  [/mushroom/i, "🍄"],
  [/cabbage|broccoli|greens/i, "🥬"],
  [/corn/i, "🌽"],
  [/brinjal|beetroot|gourd|beans|bhindi|ladyfinger|cauliflower|cucumber|vegetable/i, "🥒"],
  [/banana/i, "🍌"],
  [/apple/i, "🍎"],
  [/mango/i, "🥭"],
  [/orange|lemon|lime/i, "🍋"],
  [/grape|berry|pomegranate/i, "🍇"],
  [/watermelon|melon/i, "🍉"],
  [/papaya|pineapple|kiwi|guava|pear|fruit/i, "🍍"],
  [/masala|turmeric|haldi|cumin|jeera|coriander|pepper|cardamom|elaichi|cinnamon|dalchini|clove|laung|bay leaf|tej patta|saffron|kesar|fennel|saunf|methi|hing|asafoetida|mustard seed|spice/i, "🧂"],
  [/\bsalt\b/i, "🧂"],
  [/oil/i, "🍶"],
  [/chips|nachos|crisp|kurkure|namkeen|mixture|bhujia/i, "🍟"],
  [/popcorn/i, "🍿"],
  [/biscuit|cookie|rusk/i, "🍪"],
  [/chocolate|kitkat|gems|munch|5 star|perk/i, "🍫"],
  [/ice cream|kulfi|gulab|halwa|dessert/i, "🍨"],
  [/cake|muffin|pastry|danish|puff/i, "🧁"],
  [/coffee|nescafe|bru/i, "☕"],
  [/tea|chai/i, "🍵"],
  [/juice|frooti|maaza|slice|tropicana|real/i, "🧃"],
  [/cola|pepsi|sprite|thums|fanta|limca|soda|drink|dew/i, "🥤"],
  [/noodle|maggi|pasta|ramen/i, "🍜"],
  [/soup/i, "🍲"],
  [/fries|momo|nugget|tikki|frozen/i, "🧊"],
  [/honey|jam|ketchup|sauce|mayo|dip|salsa|spread/i, "🍯"],
  [/sugar|jaggery/i, "🍬"],
  [/diaper|wipes|baby/i, "🍼"],
  [/shampoo|conditioner|hair/i, "🧴"],
  [/soap|body wash|face wash|handwash|toothpaste|razor|shaving|lotion|moistur/i, "🧼"],
  [/detergent|dishwash|cleaner|disinfect|fabric|scrub|garbage|freshener|repellent|coil/i, "🧽"],
];

const PALETTES: [string, string][] = [
  ["#ecfdf5", "#d1fae5"],
  ["#eff6ff", "#dbeafe"],
  ["#fef3c7", "#fde68a"],
  ["#fdf4ff", "#fae8ff"],
  ["#fff1f2", "#ffe4e6"],
  ["#f0fdfa", "#ccfbf1"],
];

function emojiFor(product: Pick<Product, "name" | "subcategory" | "tags">): string {
  const haystack = `${product.name} ${product.subcategory} ${product.tags.join(" ")}`;
  for (const [pattern, emoji] of EMOJI_RULES) {
    if (pattern.test(haystack)) return emoji;
  }
  return "🛒";
}

function hash(value: string): number {
  let total = 0;
  for (let i = 0; i < value.length; i += 1) total = (total * 31 + value.charCodeAt(i)) % 100000;
  return total;
}

/**
 * The demo catalogue ships without photography, so every product gets a stable,
 * category-coloured tile instead of a broken image.
 */
export function productArt(product: Pick<Product, "id" | "name" | "subcategory" | "tags">): string {
  const [from, to] = PALETTES[hash(product.id) % PALETTES.length];
  const emoji = emojiFor(product);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/></linearGradient></defs><rect width="240" height="240" fill="url(#g)"/><text x="120" y="150" text-anchor="middle" font-size="104">${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
