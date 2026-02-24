export interface Env {
  OPENAI_API_KEY: string;
  OPENAI_MODEL?: string;
  SHARE_DB?: D1Database;
  SHARE_TTL_SECONDS?: string;
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
- list_title should be a short, natural shopping-run name (2-6 words). If one recipe/theme dominates, reflect it.
- list_title must be specific and memorable, never generic ("grocery run", "shopping list", "grocery and household run").
- If there is no clear theme, build a slightly silly title using the two most unusual items.
- category_hint should be the best coarse aisle bucket for compatibility.
- Choose major_section only from the scaffold section IDs.
- Choose subsection from the scaffold subsection labels when possible, else null.
- within_section_order must be a 1-based integer for the item's relative order inside its major section.

Scaffold (major sections and in-section ordering reference):
${scaffoldPrompt}`;

const outputFormat = {
  type: "json_schema",
  name: "shopping_list_extraction_v3",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["list_title", "items", "warnings"],
    properties: {
      list_title: { type: ["string", "null"] },
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

const SHARE_ID_BYTE_LENGTH = 16;
const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const DEFAULT_SHARE_TTL_SECONDS = 60 * 60 * 24 * 30;
const MAX_SHARE_TOKEN_LENGTH = 32_000;

const withCors = (response: Response): Response => {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
};

const jsonResponse = (status: number, payload: unknown): Response => {
  return withCors(
    new Response(JSON.stringify(payload), {
      status,
      headers: {
        "Content-Type": "application/json"
      }
    })
  );
};

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const createShareId = (): string => {
  const bytes = new Uint8Array(SHARE_ID_BYTE_LENGTH);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
};

const parseShareTtlSeconds = (value: string | undefined): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SHARE_TTL_SECONDS;
  }
  return Math.max(60, Math.min(60 * 60 * 24 * 180, Math.floor(parsed)));
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

const handleVisionParse = async (request: Request, env: Env): Promise<Response> => {
  if (!env.OPENAI_API_KEY) {
    return withCors(new Response("OPENAI_API_KEY missing", { status: 500 }));
  }

  let payload: { imageBase64: string; mimeType: string; model?: string };
  try {
    payload = (await request.json()) as { imageBase64: string; mimeType: string; model?: string };
  } catch {
    return withCors(new Response("Invalid JSON body", { status: 400 }));
  }

  if (!payload.imageBase64) {
    return withCors(new Response("Missing imageBase64", { status: 400 }));
  }

  const requestedModel = typeof payload.model === "string" ? payload.model.trim() : "";
  const model = requestedModel || env.OPENAI_MODEL || "gpt-5.2";

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
};

const handleShareCreate = async (request: Request, env: Env): Promise<Response> => {
  const shareDb = env.SHARE_DB;
  if (!shareDb) {
    return jsonResponse(500, {
      error: "SHARE_DB missing. Configure a D1 binding named SHARE_DB in wrangler config."
    });
  }

  let payload: { token?: unknown };
  try {
    payload = (await request.json()) as { token?: unknown };
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body." });
  }

  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  if (!token) {
    return jsonResponse(400, { error: "Missing token." });
  }
  if (token.length > MAX_SHARE_TOKEN_LENGTH) {
    return jsonResponse(413, { error: "Token too large." });
  }
  if (!/^v[12]\./.test(token)) {
    return jsonResponse(400, { error: "Invalid token format." });
  }

  const now = Date.now();
  const ttlSeconds = parseShareTtlSeconds(env.SHARE_TTL_SECONDS);
  const expiresAtMs = now + ttlSeconds * 1000;
  const expiresAtIso = new Date(expiresAtMs).toISOString();

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const id = createShareId();
    try {
      await shareDb
        .prepare(
          "INSERT INTO shared_lists (id, token, created_at_ms, expires_at_ms, access_count, last_accessed_at_ms) VALUES (?1, ?2, ?3, ?4, 0, NULL)"
        )
        .bind(id, token, now, expiresAtMs)
        .run();

      return jsonResponse(201, {
        id,
        expiresAt: expiresAtIso
      });
    } catch (error) {
      const message = String(error);
      if (/UNIQUE constraint failed/i.test(message)) {
        continue;
      }
      if (/no such table/i.test(message)) {
        return jsonResponse(500, {
          error: "shared_lists table missing. Run worker/schema.sql against the D1 database."
        });
      }
      return jsonResponse(500, {
        error: "Could not store share payload."
      });
    }
  }

  return jsonResponse(503, { error: "Could not allocate a unique share ID." });
};

const handleShareFetch = async (shareIdRaw: string, env: Env): Promise<Response> => {
  const shareDb = env.SHARE_DB;
  if (!shareDb) {
    return jsonResponse(500, {
      error: "SHARE_DB missing. Configure a D1 binding named SHARE_DB in wrangler config."
    });
  }

  const shareId = shareIdRaw.trim();
  if (!SHARE_ID_PATTERN.test(shareId)) {
    return jsonResponse(400, { error: "Invalid share ID." });
  }

  interface ShareRow {
    token: string;
    expires_at_ms: number | null;
  }

  let row: ShareRow | null;
  try {
    row = await shareDb
      .prepare("SELECT token, expires_at_ms FROM shared_lists WHERE id = ?1")
      .bind(shareId)
      .first<ShareRow>();
  } catch (error) {
    const message = String(error);
    if (/no such table/i.test(message)) {
      return jsonResponse(500, {
        error: "shared_lists table missing. Run worker/schema.sql against the D1 database."
      });
    }
    return jsonResponse(500, { error: "Could not load share payload." });
  }

  if (!row || typeof row.token !== "string") {
    return jsonResponse(404, { error: "Share link not found." });
  }

  const now = Date.now();
  const expiresAtMs = typeof row.expires_at_ms === "number" ? row.expires_at_ms : null;
  if (expiresAtMs !== null && expiresAtMs < now) {
    await shareDb
      .prepare("DELETE FROM shared_lists WHERE id = ?1")
      .bind(shareId)
      .run()
      .catch(() => undefined);
    return jsonResponse(410, { error: "Share link expired." });
  }

  await shareDb
    .prepare(
      "UPDATE shared_lists SET access_count = access_count + 1, last_accessed_at_ms = ?2 WHERE id = ?1"
    )
    .bind(shareId, now)
    .run()
    .catch(() => undefined);

  return jsonResponse(200, {
    id: shareId,
    token: row.token,
    expiresAt: expiresAtMs ? new Date(expiresAtMs).toISOString() : null
  });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);
    if (url.pathname === "/api/vision-parse" && request.method === "POST") {
      return handleVisionParse(request, env);
    }
    if (url.pathname === "/api/share" && request.method === "POST") {
      return handleShareCreate(request, env);
    }
    if (url.pathname.startsWith("/api/share/") && request.method === "GET") {
      let shareId = "";
      try {
        shareId = decodeURIComponent(url.pathname.slice("/api/share/".length));
      } catch {
        return jsonResponse(400, { error: "Invalid share ID." });
      }
      return handleShareFetch(shareId, env);
    }
    return withCors(new Response("Not Found", { status: 404 }));
  }
};
