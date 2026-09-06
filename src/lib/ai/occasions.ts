export type CourseSlot = {
  role: "main" | "carb" | "side" | "snack" | "drink" | "dessert";
  /** Candidate recipes, cheapest-first preference is resolved by the planner. */
  options: string[];
  /** Dropped first when the budget is tight. */
  optional?: boolean;
};

export type OccasionTemplate = {
  id: string;
  name: string;
  aliases: string[];
  /** Per-head rupee budget the template is happy at, used to pick courses. */
  comfortablePerHead: number;
  summary: string;
  courses: CourseSlot[];
};

/**
 * When someone asks for an outcome ("dinner for 4") rather than a dish, the
 * planner composes a meal from these slots and then fits it to the budget.
 */
export const OCCASIONS: OccasionTemplate[] = [
  {
    id: "dinner",
    name: "Dinner",
    aliases: ["dinner", "evening meal", "supper", "khana"],
    comfortablePerHead: 150,
    summary: "A main, something to mop it up with, and a fresh side.",
    courses: [
      { role: "main", options: ["dal-tadka", "rajma-masala", "chole-masala", "matar-paneer", "paneer-butter-masala", "chicken-curry", "mixed-veg-curry", "egg-curry"] },
      { role: "carb", options: ["roti", "jeera-rice", "veg-pulao"] },
      { role: "side", options: ["kachumber-salad", "boondi-raita"], optional: true },
    ],
  },
  {
    id: "lunch",
    name: "Lunch",
    aliases: ["lunch", "midday meal", "afternoon meal"],
    comfortablePerHead: 140,
    summary: "A comforting main with rice or roti.",
    courses: [
      { role: "main", options: ["dal-tadka", "sambar", "aloo-gobi", "mixed-veg-curry", "chole-masala", "chicken-curry", "khichdi"] },
      { role: "carb", options: ["jeera-rice", "roti"] },
      { role: "side", options: ["boondi-raita", "kachumber-salad"], optional: true },
    ],
  },
  {
    id: "breakfast",
    name: "Breakfast",
    aliases: ["breakfast", "morning meal", "nashta", "brunch"],
    comfortablePerHead: 90,
    summary: "Something warm on the plate and something to drink.",
    courses: [
      { role: "main", options: ["poha", "upma", "masala-omelette", "veg-sandwich", "oats-bowl", "besan-chilla", "idli-sambar", "masala-dosa", "aloo-paratha", "cereal-milk"] },
      { role: "drink", options: ["masala-chai"], optional: true },
    ],
  },
  {
    id: "party",
    name: "House Party",
    aliases: ["party", "hosting", "guests", "get together", "gathering", "house party", "friends over"],
    comfortablePerHead: 260,
    summary: "Starters to graze on, a proper main, drinks and something sweet.",
    courses: [
      { role: "snack", options: ["party-starters", "nachos-platter"] },
      { role: "main", options: ["chicken-biryani", "veg-biryani", "paneer-butter-masala", "butter-chicken", "chole-masala"] },
      { role: "carb", options: ["jeera-rice", "roti"], optional: true },
      { role: "drink", options: ["cold-drinks"] },
      { role: "dessert", options: ["ice-cream-dessert", "gulab-jamun"], optional: true },
    ],
  },
  {
    id: "movie-night",
    name: "Movie Night",
    aliases: ["movie night", "movie", "netflix", "film night", "match night", "game night"],
    comfortablePerHead: 160,
    summary: "Everything you eat with your hands, plus something cold.",
    courses: [
      { role: "snack", options: ["movie-night-snacks"] },
      { role: "snack", options: ["nachos-platter"], optional: true },
      { role: "dessert", options: ["ice-cream-dessert"], optional: true },
    ],
  },
  {
    id: "snacks",
    name: "Evening Snacks",
    aliases: ["snacks", "evening snacks", "munchies", "chai time", "tea time"],
    comfortablePerHead: 110,
    summary: "Chai and things to dip into it.",
    courses: [
      { role: "snack", options: ["party-starters", "nachos-platter"] },
      { role: "drink", options: ["masala-chai"], optional: true },
    ],
  },
  {
    id: "quick-meal",
    name: "Quick Meal",
    aliases: ["quick meal", "something quick", "something fast", "lazy dinner", "instant", "no cooking", "quick"],
    comfortablePerHead: 90,
    summary: "On the table in fifteen minutes.",
    courses: [
      { role: "main", options: ["maggi", "veg-sandwich", "pasta-red-sauce", "chicken-fried-rice"] },
      { role: "drink", options: ["cold-drinks"], optional: true },
    ],
  },
];

const OCCASION_BY_ID = new Map(OCCASIONS.map((entry) => [entry.id, entry]));

export function getOccasion(id: string): OccasionTemplate | undefined {
  return OCCASION_BY_ID.get(id);
}

export function findOccasion(text: string): OccasionTemplate | null {
  const needle = text.toLowerCase();
  let best: { template: OccasionTemplate; score: number } | null = null;
  for (const template of OCCASIONS) {
    for (const alias of [template.id, ...template.aliases]) {
      if (needle.includes(alias) && (!best || alias.length > best.score)) {
        best = { template, score: alias.length };
      }
    }
  }
  return best ? best.template : null;
}
