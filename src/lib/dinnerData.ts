// day() index -> list key
// 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday

export const dinnerLists = {
  Monday: [
    "Chicken Alfredo",
    "Chicken Parmesan Baked Ziti",
    "Spaghetti",
    "Mac and Cheese",
    "Mac and Cheese Hot Dogs",
    "Skillet Lasagna",
    "Garlic Parmesan Pasta",
    "Cream Cheese Bacon Chicken Pasta",
    "Goulash",
    // "Manicotti",
  ],
  Tuesday: [
    "Nacho Bar",
    "Tacos",
    "Taco Salad",
    "Idaho Nachos",
    "Quesadillas",
    "Chicken Salad",
    // "Enchiladas",
    // "Chicken Fajitas",
  ],
  Wednesday: [
    "Stack Dinners",
    "Orange Chicken",
    "Spanish Rice",
    "Butter Chicken",
    "Garlic Chicken",
    "Teriyaki Chicken",
    "Sticky Garlic Chicken Bites",
    // "3 Ingredient Teriyaki Chicken",
    // "Mongolian Ground Beef Noodles",
  ],
  Thursday: [
    "Breakfast Burritos",
    "Omelettes",
    "Pancakes",
    "Waffles",
    "French Toast",
    "Strawberry Cream Cheese French Toast Rollups",
    // "Breakfast Quesadillas",
  ],
  Friday: [
    "Pizza Bombs",
    "Sloppy Joes",
    "Grilled Cheese",
    "Cheeseburgers",
    "Bacon Cheeseburgers",
    "Hot Dogs",
    "Chicken Wraps",
    "Chicken Nuggets",
    "Pitas",
    "Tortilla Pizza",
  ],
  Weekend: [
    "Philly Cheesesteaks",
    "Stroganoff",
    "Mashed Potatoes and Steak",
    "Potato Soup",
    "Wontons",
    "Homemade Chicken Nuggets",
    "Bubble Pizza",
    "Pigs in a Blanket",
    "Garlic Parmesan Chicken Tenders",
    "Crispy Bacon and Cheese Potatoes",
    "Sliders",
    "French Bread Pizza",
    "Garlic Parmesan Mac and Cheese",
    "Wings",
//     "Cheesy Potato Casserole",
//     "Navajo Tacos",
//     "Funeral Potatoes",
  ],
  Dessert: [
    "Cosmic Brownies",
    "Fluffy Air Fryer Churro Bites",
    "Fried Strawberry Cheesecake Sandwiches",
    "Cinnamon Sugar Pizza with Crescent Rolls",
    "Cinnamon Roll French Toast",
    "No Bake Chocolate Peanut Butter Bars",
    "Strawberry Cream Cheese Bites",
    "3 Ingredient Peanut Butter Cups",
    "Cinnamon Rolls",
    "Pumpkin Chocolate Chip Bread",
  ],
  NewThings: [
    "Mongolian Ground Beef Noodles",
    "Manicotti",
    "Ultimate Bacon Cheeseburger Rollups",
    "Crispy Wonton Mozzarella Sticks",
    "Chicken Bacon Ranch Rollups",
    "Crispy Cheese and Bacon Potatoes",
    "Meatballs",
    "Bacon Ranch Chicken Bake",
    "Potato Wedges",
    "Breakfast Quesadillas",
    "Rosemary Chicken with Potatoes",
    "Buttermilk Fried Chicken",
    "Smothered Bacon Chicken",
    "Crack Chicken Tenders",
    "Fried Chicken",
  ],
} as const;

export const lunchLists = {
  Sandwiches: [
    "PB&J",
    "Grilled Cheese",
    "BLT",
    "Turkey Sandwich",
    "Ham and Cheese",
    "Tuna Melt",
    "Club Sandwich",
    "Egg Salad Sandwich",
  ],
  Salads: [
    "Caesar Salad",
    "Chicken Salad",
    "Cobb Salad",
    "Garden Salad",
    "Greek Salad",
    "Taco Salad",
  ],
  "Quick & Easy": [
    "Mac and Cheese",
    "Ramen",
    "Soup and Sandwich",
    "Leftovers",
    "Quesadillas",
    "Hot Dogs",
    "Chicken Nuggets",
    "Pizza Rolls",
    "Cup Noodles",
  ],
  Wraps: [
    "Chicken Wrap",
    "BLT Wrap",
    "Turkey Ranch Wrap",
    "Veggie Wrap",
    "Burrito",
  ],
  Soups: [
    "Tomato Soup",
    "Chicken Noodle Soup",
    "Chili",
    "Clam Chowder",
    "Loaded Baked Potato Soup",
  ],
} as const;

export const breakfastLists = {
  "Eggs & Savory": [
    "Scrambled Eggs",
    "Fried Eggs",
    "Omelette",
    "Breakfast Burritos",
    "Egg Sandwich",
    "Bacon and Eggs",
    "Avocado Toast",
    "Biscuits and Gravy",
  ],
  "Pancakes & Waffles": [
    "Pancakes",
    "Waffles",
    "French Toast",
    "Crepes",
    "Cinnamon Roll French Toast",
    "Strawberry Cream Cheese French Toast Rollups",
  ],
  "Cereal & Quick": [
    "Cereal",
    "Oatmeal",
    "Yogurt Parfait",
    "Granola",
    "Toast and Peanut Butter",
    "Bagel with Cream Cheese",
    "Fruit and Yogurt",
  ],
  "Baked Goods": [
    "Cinnamon Rolls",
    "Muffins",
    "Banana Bread",
    "Donuts",
    "Scones",
  ],
} as const;

export type ListKey = keyof typeof dinnerLists;

// Map moment day index (0=Sun … 6=Sat) to a list key
export const DAY_TO_LIST: Record<number, ListKey> = {
  0: "Weekend",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Weekend",
};

// Tailwind classes per day-of-week (bg + border + header)
export const DAY_COLORS: Record<number, { bg: string; border: string; header: string; tag: string }> = {
  0: { bg: "bg-orange-50",  border: "border-orange-200", header: "bg-orange-200",  tag: "Weekend"   },
  1: { bg: "bg-blue-50",    border: "border-blue-200",   header: "bg-blue-200",    tag: "Pasta"     },
  2: { bg: "bg-yellow-50",  border: "border-yellow-200", header: "bg-yellow-200",  tag: "Mexican"   },
  3: { bg: "bg-purple-50",  border: "border-purple-200", header: "bg-purple-200",  tag: "Rice/Asian"},
  4: { bg: "bg-amber-50",   border: "border-amber-200",  header: "bg-amber-200",   tag: "Breakfast" },
  5: { bg: "bg-rose-50",    border: "border-rose-200",   header: "bg-rose-200",    tag: "Budget"    },
  6: { bg: "bg-orange-50",  border: "border-orange-200", header: "bg-orange-200",  tag: "Weekend"   },
};

export function pickRandom<T>(items: readonly T[], exclude?: T): T {
  const pool = exclude !== undefined ? items.filter((i) => i !== exclude) : [...items];
  return pool[Math.floor(Math.random() * pool.length)];
}

export type MealLists = {
  dinner: Record<string, string[]>;
  lunch: Record<string, string[]>;
  breakfast: Record<string, string[]>;
};

export type DaySchedule = Record<number, string[]>;

export const DEFAULT_DAY_SCHEDULE: DaySchedule = {
  0: ["Weekend"],
  1: ["Monday"],
  2: ["Tuesday"],
  3: ["Wednesday"],
  4: ["Thursday"],
  5: ["Friday"],
  6: ["Weekend"],
};

export function getDefaultMealLists(): MealLists {
  return {
    dinner: Object.fromEntries(
      Object.entries(dinnerLists).map(([k, v]) => [k, [...v]])
    ),
    lunch: Object.fromEntries(
      Object.entries(lunchLists).map(([k, v]) => [k, [...v]])
    ),
    breakfast: Object.fromEntries(
      Object.entries(breakfastLists).map(([k, v]) => [k, [...v]])
    ),
  };
}

export function getEmptyMealLists(): MealLists {
  return {
    dinner: {},
    lunch: {},
    breakfast: {},
  };
}
