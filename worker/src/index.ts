export interface Env {
  OPENAI_API_KEY: string;
  OPENAI_MODEL?: string;
}

const CATEGORY_ENUM = [
  "produce",
  "bakery",
  "deli",
  "meat_seafood",
  "dairy_eggs",
  "frozen",
  "pantry",
  "snacks",
  "beverages",
  "household",
  "personal_care",
  "pet",
  "other"
];

interface MajorSectionSpec {
  id: string;
  label: string;
  subsections: string[];
}

const MAJOR_SECTION_SCAFFOLD: MajorSectionSpec[] = [
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

const MAJOR_SECTION_ENUM = MAJOR_SECTION_SCAFFOLD.map((section) => section.id) as readonly string[];

const scaffoldPrompt = MAJOR_SECTION_SCAFFOLD.map((section, index) => {
  const lines = [`${index + 1}. ${section.label}`];
  for (const subsection of section.subsections) {
    lines.push(`   - ${subsection}`);
  }
  return lines.join("\\n");
}).join("\\n\\n");

const parserSystemPrompt =
  "You are a grocery shopping list parser. Extract every distinct item from the photo of a shopping list. Preserve intent, separate quantity and notes, and classify every item using the provided store-layout scaffold.";

const parserUserPrompt = `Return one object per item.
- Split multiple items on one line.
- Never invent unseen items.
- If uncertain, include your best guess and add warning text.
- category_hint should be the best coarse aisle bucket for compatibility.
- Choose major_section only from the scaffold section IDs.
- Choose subsection from the scaffold subsection labels when possible, else null.
- within_section_order must be a 1-based integer for the item's relative order inside its major section.

Scaffold (major sections and in-section ordering reference):
${scaffoldPrompt}`;

const outputFormat = {
  type: "json_schema",
  name: "shopping_list_extraction_v2",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["items", "warnings"],
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "raw_text",
            "canonical_name",
            "quantity",
            "notes",
            "category_hint",
            "major_section",
            "subsection",
            "within_section_order"
          ],
          properties: {
            raw_text: { type: "string" },
            canonical_name: { type: "string" },
            quantity: { type: ["string", "null"] },
            notes: { type: ["string", "null"] },
            category_hint: { type: ["string", "null"], enum: [...CATEGORY_ENUM, null] },
            major_section: { type: ["string", "null"], enum: [...MAJOR_SECTION_ENUM, null] },
            subsection: { type: ["string", "null"] },
            within_section_order: { type: ["integer", "null"], minimum: 1 }
          }
        }
      },
      warnings: { type: "array", items: { type: "string" } }
    }
  }
};

const withCors = (response: Response): Response => {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
};

const parseOutputText = (body: any): string => {
  if (typeof body?.output_text === "string") {
    return body.output_text;
  }

  const output = Array.isArray(body?.output) ? body.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const block of content) {
      if ((block?.type === "output_text" || block?.type === "text") && typeof block?.text === "string") {
        return block.text;
      }
    }
  }

  throw new Error("Unexpected response format from OpenAI");
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);
    if (url.pathname !== "/api/vision-parse" || request.method !== "POST") {
      return withCors(new Response("Not Found", { status: 404 }));
    }

    if (!env.OPENAI_API_KEY) {
      return withCors(new Response("OPENAI_API_KEY missing", { status: 500 }));
    }

    let payload: { imageBase64: string; mimeType: string };
    try {
      payload = (await request.json()) as { imageBase64: string; mimeType: string };
    } catch {
      return withCors(new Response("Invalid JSON body", { status: 400 }));
    }

    if (!payload.imageBase64) {
      return withCors(new Response("Missing imageBase64", { status: 400 }));
    }

    const model = env.OPENAI_MODEL || "gpt-5.2";

    const openAiResp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: parserSystemPrompt
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: parserUserPrompt
              },
              {
                type: "input_image",
                image_url: `data:${payload.mimeType || "image/jpeg"};base64,${payload.imageBase64}`,
                detail: "high"
              }
            ]
          }
        ],
        text: {
          format: outputFormat
        }
      })
    });

    if (!openAiResp.ok) {
      const errorBody = await openAiResp.text();
      return withCors(new Response(errorBody, { status: openAiResp.status }));
    }

    const body = await openAiResp.json();
    const outputText = parseOutputText(body);

    return withCors(
      new Response(outputText, {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      })
    );
  }
};
