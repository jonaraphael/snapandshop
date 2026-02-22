import type { CategoryId, MajorSectionId } from "../../app/types";

export interface MajorSectionSpec {
  id: MajorSectionId;
  label: string;
  subsections: string[];
}

export const MAJOR_SECTION_SCAFFOLD: MajorSectionSpec[] = [
  {
    id: "entry_front_of_store",
    label: "Entry / Front of store",
    subsections: [
      "Seasonal / promos / endcaps",
      "Membership desk (warehouse clubs)",
      "Returns and customer service",
      "Pharmacy pickup window (drugstores, some groceries)",
      "Photo / print counter (drugstores)",
      "Optical (warehouse clubs, some big box)",
      "Hearing aid center (warehouse clubs)",
      "Carts / baskets",
      "Grab and go coolers",
      "Flowers and plants (some stores)",
      "Travel and impulse items"
    ]
  },
  {
    id: "produce",
    label: "Produce",
    subsections: [
      "Organic produce",
      "Conventional produce",
      "Fresh herbs",
      "Packaged salads / cut fruit",
      "Bulk produce (potatoes, onions) and mushrooms"
    ]
  },
  {
    id: "bakery",
    label: "Bakery",
    subsections: [
      "Fresh bread",
      "Pastries and desserts",
      "Tortillas / pita / wraps",
      "Custom cakes / special orders",
      "In store bakery production area (some stores)"
    ]
  },
  {
    id: "prepared_foods_and_deli_cluster",
    label: "Prepared foods and deli cluster",
    subsections: [
      "Prepared foods (hot bar, salad bar, soups)",
      "Pizza / sandwiches (where offered)",
      "Deli counter (sliced meats)",
      "Rotisserie chicken",
      "Ready to eat packaged meals",
      "Charcuterie and antipasti"
    ]
  },
  {
    id: "cheese_and_specialty_dairy",
    label: "Cheese and specialty dairy",
    subsections: [
      "Specialty cheese case",
      "Packaged cheese",
      "Yogurt / cultured dairy",
      "Butter and cream",
      "Eggs (sometimes nearby)"
    ]
  },
  {
    id: "meat_and_poultry",
    label: "Meat and poultry",
    subsections: [
      "Service counter (butcher)",
      "Packaged meats",
      "Sausages and marinated items",
      "Broth / stocks nearby (sometimes)"
    ]
  },
  {
    id: "seafood",
    label: "Seafood",
    subsections: [
      "Fresh fish counter",
      "Shellfish",
      "Smoked and packaged seafood"
    ]
  },
  {
    id: "perimeter_refrigerated_wall",
    label: "Perimeter refrigerated wall",
    subsections: [
      "Milk and alt milks",
      "Refrigerated breakfast meats",
      "Fresh pasta",
      "Refrigerated sauces, pesto, hummus, dips",
      "Tofu / tempeh / plant based proteins",
      "Refrigerated ready meals"
    ]
  },
  {
    id: "frozen",
    label: "Frozen",
    subsections: [
      "Ice cream and novelties",
      "Frozen fruit and vegetables",
      "Frozen meals",
      "Frozen pizza",
      "Frozen breakfast",
      "Frozen meat and seafood",
      "Ice"
    ]
  },
  {
    id: "alcohol",
    label: "Alcohol (varies by state and store)",
    subsections: [
      "Beer",
      "Wine",
      "Spirits (where legal)",
      "Mixers (sometimes)"
    ]
  },
  {
    id: "dry_grocery_aisles",
    label: "Dry grocery aisles",
    subsections: [
      "Pasta, grains, rice",
      "Canned goods",
      "Sauces and condiments",
      "International foods",
      "Oils and vinegars",
      "Spices and seasonings",
      "Baking supplies",
      "Cereal and breakfast",
      "Coffee and tea",
      "Crackers and shelf stable breads",
      "Snacks",
      "Candy"
    ]
  },
  {
    id: "bulk_foods",
    label: "Bulk foods (if present)",
    subsections: [
      "Bulk grains, beans, pasta",
      "Bulk nuts and dried fruit",
      "Bulk candy",
      "Bulk spices / coffee (some stores)"
    ]
  },
  {
    id: "beverages",
    label: "Beverages (often spans multiple aisles in larger stores)",
    subsections: [
      "Water and sparkling water",
      "Soda",
      "Juice (shelf stable)",
      "Sports drinks and energy drinks",
      "Drink mixes and powdered beverages"
    ]
  },
  {
    id: "health_and_wellness",
    label: "Health and wellness (grocery style)",
    subsections: [
      "Vitamins and supplements",
      "Sports nutrition",
      "First aid and OTC meds",
      "Feminine care",
      "Adult care (incontinence)"
    ]
  },
  {
    id: "pharmacy",
    label: "Pharmacy (drugstores, some groceries and big box)",
    subsections: [
      "Prescription drop off and pickup",
      "Immunizations (where offered)",
      "Pharmacy waiting area",
      "Health screenings / clinic (some drugstores)"
    ]
  },
  {
    id: "personal_care_and_beauty",
    label: "Personal care and beauty (especially drugstores)",
    subsections: [
      "Skincare",
      "Hair care",
      "Cosmetics",
      "Deodorant and shaving",
      "Oral care",
      "Fragrance",
      "Nail care"
    ]
  },
  {
    id: "baby_and_family",
    label: "Baby and family",
    subsections: [
      "Diapers and wipes",
      "Baby food and formula",
      "Baby toiletries",
      "Kids health"
    ]
  },
  {
    id: "household_and_cleaning",
    label: "Household and cleaning",
    subsections: [
      "Laundry",
      "Dish and surface cleaners",
      "Paper towels and toilet paper",
      "Trash bags",
      "Air fresheners",
      "Pest control",
      "Light bulbs and small home utility"
    ]
  },
  {
    id: "pet",
    label: "Pet",
    subsections: [
      "Pet food",
      "Treats",
      "Litter and supplies"
    ]
  },
  {
    id: "home_goods_and_seasonal",
    label: "Home goods and seasonal (big box and warehouse clubs)",
    subsections: [
      "Kitchen and small appliances",
      "Cookware and storage containers",
      "Bedding and bath",
      "Home decor",
      "Holiday and seasonal items",
      "Patio and garden (seasonal)",
      "Grills and outdoor cooking (seasonal)"
    ]
  },
  {
    id: "office_and_school",
    label: "Office and school (drugstores and big box)",
    subsections: [
      "Stationery and office supplies",
      "School supplies",
      "Ink and paper (some stores)"
    ]
  },
  {
    id: "electronics_and_media",
    label: "Electronics and media (big box, some drugstores)",
    subsections: [
      "Headphones and cables",
      "Small electronics and accessories",
      "Batteries (sometimes here, sometimes at checkout)",
      "Gift cards (often near checkout)"
    ]
  },
  {
    id: "apparel",
    label: "Apparel (warehouse clubs and big box)",
    subsections: [
      "Basics (socks, underwear)",
      "Casual clothing",
      "Outerwear (seasonal)",
      "Shoes (some stores)"
    ]
  },
  {
    id: "automotive",
    label: "Automotive (big box and warehouse clubs)",
    subsections: [
      "Motor oil and fluids",
      "Wiper blades",
      "Car accessories",
      "Tires and tire center (warehouse clubs)"
    ]
  },
  {
    id: "sports_fitness_and_outdoors",
    label: "Sports, fitness, and outdoors (big box and warehouse clubs)",
    subsections: [
      "Fitness equipment and accessories",
      "Camping and outdoor gear",
      "Bikes (seasonal)"
    ]
  },
  {
    id: "books_cards_and_party",
    label: "Books, cards, and party (drugstores, some groceries)",
    subsections: [
      "Greeting cards",
      "Gift wrap and bags",
      "Party supplies",
      "Small books and magazines"
    ]
  },
  {
    id: "services_and_specialty_counters",
    label: "Services and specialty counters (varies)",
    subsections: [
      "Food court (warehouse clubs)",
      "Vision center (optical)",
      "Hearing aid center",
      "Travel services (some warehouse clubs)",
      "Money services (some stores)",
      "Key cutting (some big box)",
      "Coin counting (some groceries)"
    ]
  },
  {
    id: "checkout_exit",
    label: "Checkout / exit",
    subsections: [
      "Registers / self checkout",
      "Impulse items",
      "Returns desk (sometimes near exit)",
      "Pickup lockers / online order pickup (some stores)"
    ]
  }
];

export const MAJOR_SECTION_ORDER: MajorSectionId[] = MAJOR_SECTION_SCAFFOLD.map((section) => section.id);

export const MAJOR_SECTION_LABELS: Record<MajorSectionId, string> = MAJOR_SECTION_SCAFFOLD.reduce(
  (acc, section) => {
    acc[section.id] = section.label;
    return acc;
  },
  {} as Record<MajorSectionId, string>
);

export const MAJOR_SECTION_RANK: Record<MajorSectionId, number> = MAJOR_SECTION_ORDER.reduce(
  (acc, sectionId, index) => {
    acc[sectionId] = index;
    return acc;
  },
  {} as Record<MajorSectionId, number>
);

export const MAJOR_SECTION_TO_CATEGORY: Record<MajorSectionId, CategoryId> = {
  entry_front_of_store: "other",
  produce: "produce",
  bakery: "bakery",
  prepared_foods_and_deli_cluster: "deli",
  cheese_and_specialty_dairy: "dairy_eggs",
  meat_and_poultry: "meat_seafood",
  seafood: "meat_seafood",
  perimeter_refrigerated_wall: "dairy_eggs",
  frozen: "frozen",
  alcohol: "beverages",
  dry_grocery_aisles: "pantry",
  bulk_foods: "pantry",
  beverages: "beverages",
  health_and_wellness: "personal_care",
  pharmacy: "personal_care",
  personal_care_and_beauty: "personal_care",
  baby_and_family: "personal_care",
  household_and_cleaning: "household",
  pet: "pet",
  home_goods_and_seasonal: "household",
  office_and_school: "household",
  electronics_and_media: "other",
  apparel: "other",
  automotive: "household",
  sports_fitness_and_outdoors: "other",
  books_cards_and_party: "other",
  services_and_specialty_counters: "other",
  checkout_exit: "snacks"
};

export const MAJOR_SECTION_PROMPT_SCAFFOLD = MAJOR_SECTION_SCAFFOLD.map((section, index) => {
  const lines = [`${index + 1}. ${section.label}`];
  for (const subsection of section.subsections) {
    lines.push(`   - ${subsection}`);
  }
  return lines.join("\n");
}).join("\n\n");
