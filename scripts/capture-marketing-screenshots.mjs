import { access, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium, devices } from "@playwright/test";

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_DIR = path.resolve("marketing-assets", "iphone");
const MARKETING_IMAGE_PATH = process.env.MARKETING_IMAGE_PATH ?? "test.jpg";

const STORAGE_KEYS = {
  prefs: "cl:prefs",
  session: "cl:lastSession",
  recentLists: "cl:recentLists"
};

const FALLBACK_IMAGE_CANDIDATES = [MARKETING_IMAGE_PATH, "docs/images/marketing/test.jpeg", "testdata/test_list.jpg"];

const mimeTypeForPath = (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") {
    return "image/png";
  }
  if (extension === ".webp") {
    return "image/webp";
  }
  return "image/jpeg";
};

const resolveImagePath = async () => {
  for (const candidate of FALLBACK_IMAGE_CANDIDATES) {
    const absolutePath = path.resolve(candidate);
    try {
      await access(absolutePath);
      return absolutePath;
    } catch {
      // try next candidate
    }
  }
  throw new Error(
    `No marketing source image found. Tried: ${FALLBACK_IMAGE_CANDIDATES.join(", ")}`
  );
};

const loadImageDataUrl = async () => {
  const sourcePath = await resolveImagePath();
  const bytes = await readFile(sourcePath);
  const mimeType = mimeTypeForPath(sourcePath);
  return {
    sourcePath,
    dataUrl: `data:${mimeType};base64,${bytes.toString("base64")}`
  };
};

const now = new Date();
const nowIso = now.toISOString();
const day = 24 * 60 * 60 * 1000;

const marketingItems = [
  {
    id: "itm-1",
    rawText: "2 avocados",
    canonicalName: "avocados",
    normalizedName: "avocados",
    quantity: "2",
    notes: null,
    categoryId: "produce",
    subcategoryId: "fruit",
    orderHint: 10,
    checked: false,
    confidence: 0.95,
    source: "magic",
    categoryOverridden: false,
    majorSectionId: "produce",
    majorSectionLabel: "Produce",
    majorSubsection: "Conventional produce",
    majorSectionOrder: 2,
    majorSectionItemOrder: 1,
    suggested: false
  },
  {
    id: "itm-2",
    rawText: "cilantro",
    canonicalName: "cilantro",
    normalizedName: "cilantro",
    quantity: null,
    notes: null,
    categoryId: "produce",
    subcategoryId: "herbs",
    orderHint: 11,
    checked: false,
    confidence: 0.95,
    source: "magic",
    categoryOverridden: false,
    majorSectionId: "produce",
    majorSectionLabel: "Produce",
    majorSubsection: "Fresh herbs",
    majorSectionOrder: 2,
    majorSectionItemOrder: 2,
    suggested: false
  },
  {
    id: "itm-3",
    rawText: "paneer",
    canonicalName: "paneer",
    normalizedName: "paneer",
    quantity: null,
    notes: null,
    categoryId: "dairy_eggs",
    subcategoryId: "cheese",
    orderHint: 120,
    checked: false,
    confidence: 0.95,
    source: "magic",
    categoryOverridden: false,
    majorSectionId: "cheese_and_specialty_dairy",
    majorSectionLabel: "Cheese and specialty dairy",
    majorSubsection: "Specialty cheese case",
    majorSectionOrder: 5,
    majorSectionItemOrder: 1,
    suggested: false
  },
  {
    id: "itm-4",
    rawText: "basmati rice",
    canonicalName: "basmati rice",
    normalizedName: "basmati rice",
    quantity: null,
    notes: null,
    categoryId: "pantry",
    subcategoryId: "pasta_rice",
    orderHint: 220,
    checked: true,
    confidence: 0.93,
    source: "magic",
    categoryOverridden: false,
    majorSectionId: "dry_grocery_aisles",
    majorSectionLabel: "Dry grocery aisles",
    majorSubsection: "Pasta, grains, rice",
    majorSectionOrder: 12,
    majorSectionItemOrder: 1,
    suggested: false
  },
  {
    id: "itm-5",
    rawText: "garam masala",
    canonicalName: "garam masala",
    normalizedName: "garam masala",
    quantity: null,
    notes: null,
    categoryId: "pantry",
    subcategoryId: "spices",
    orderHint: 221,
    checked: false,
    confidence: 0.95,
    source: "magic",
    categoryOverridden: false,
    majorSectionId: "dry_grocery_aisles",
    majorSectionLabel: "Dry grocery aisles",
    majorSubsection: "Spices and seasonings",
    majorSectionOrder: 12,
    majorSectionItemOrder: 2,
    suggested: false
  },
  {
    id: "itm-6",
    rawText: "earl grey",
    canonicalName: "earl grey tea",
    normalizedName: "earl grey tea",
    quantity: null,
    notes: null,
    categoryId: "beverages",
    subcategoryId: null,
    orderHint: 270,
    checked: false,
    confidence: 0.92,
    source: "magic",
    categoryOverridden: false,
    majorSectionId: "beverages",
    majorSectionLabel: "Beverages (often spans multiple aisles in larger stores)",
    majorSubsection: "Drink mixes and powdered beverages",
    majorSectionOrder: 13,
    majorSectionItemOrder: 1,
    suggested: false
  },
  {
    id: "itm-7",
    rawText: "dark chocolate",
    canonicalName: "dark chocolate",
    normalizedName: "dark chocolate",
    quantity: null,
    notes: null,
    categoryId: "snacks",
    subcategoryId: null,
    orderHint: 300,
    checked: false,
    confidence: 0.9,
    source: "magic",
    categoryOverridden: false,
    majorSectionId: "dry_grocery_aisles",
    majorSectionLabel: "Dry grocery aisles",
    majorSubsection: "Candy",
    majorSectionOrder: 12,
    majorSectionItemOrder: 12,
    suggested: false
  },
  {
    id: "itm-8",
    rawText: "dishwasher tablets",
    canonicalName: "dishwasher tablets",
    normalizedName: "dishwasher tablets",
    quantity: null,
    notes: null,
    categoryId: "household",
    subcategoryId: null,
    orderHint: 400,
    checked: false,
    confidence: 0.91,
    source: "magic",
    categoryOverridden: false,
    majorSectionId: "household_and_cleaning",
    majorSectionLabel: "Household and cleaning",
    majorSubsection: "Dish and surface cleaners",
    majorSectionOrder: 18,
    majorSectionItemOrder: 2,
    suggested: false
  }
];

const buildSignature = (items) => {
  return Array.from(new Set(items.map((item) => item.normalizedName.toLowerCase()).filter(Boolean)))
    .sort()
    .join("|");
};

const toRecentItem = (item) => ({
  rawText: item.rawText,
  canonicalName: item.canonicalName,
  normalizedName: item.normalizedName,
  quantity: item.quantity,
  notes: item.notes,
  categoryId: item.categoryId,
  subcategoryId: item.subcategoryId,
  orderHint: item.orderHint,
  majorSectionId: item.majorSectionId,
  majorSectionLabel: item.majorSectionLabel,
  majorSubsection: item.majorSubsection,
  majorSectionOrder: item.majorSectionOrder,
  majorSectionItemOrder: item.majorSectionItemOrder
});

const mainSession = {
  id: "session-marketing-main",
  createdAt: new Date(now.getTime() - 2 * day).toISOString(),
  updatedAt: nowIso,
  listTitle: "Saag Paneer + Tea Treasure Hunt",
  imageHash: null,
  thumbnailDataUrl: null,
  rawText: marketingItems.map((item) => item.rawText).join("\n"),
  ocrConfidence: 0.95,
  ocrMeta: null,
  usedMagicMode: true,
  items: marketingItems
};

const recentLists = [
  {
    id: "recent-1",
    savedAt: new Date(now.getTime() - 3 * day).toISOString(),
    signature: buildSignature(marketingItems),
    listTitle: "Saag Paneer + Tea Treasure Hunt",
    itemCount: marketingItems.length,
    preview: ["avocados", "paneer", "earl grey tea", "dishwasher tablets"],
    items: marketingItems.map(toRecentItem)
  },
  {
    id: "recent-2",
    savedAt: new Date(now.getTime() - 8 * day).toISOString(),
    signature: "coconut water|miso paste|rice noodles|scallions",
    listTitle: "Miso Noodle Midnight Mission",
    itemCount: 6,
    preview: ["miso paste", "rice noodles", "scallions", "coconut water"],
    items: [
      {
        rawText: "miso paste",
        canonicalName: "miso paste",
        normalizedName: "miso paste",
        quantity: null,
        notes: null,
        categoryId: "pantry",
        subcategoryId: "international",
        orderHint: 230,
        majorSectionId: "dry_grocery_aisles",
        majorSectionLabel: "Dry grocery aisles",
        majorSubsection: "International foods",
        majorSectionOrder: 12,
        majorSectionItemOrder: 4
      },
      {
        rawText: "rice noodles",
        canonicalName: "rice noodles",
        normalizedName: "rice noodles",
        quantity: null,
        notes: null,
        categoryId: "pantry",
        subcategoryId: "pasta_rice",
        orderHint: 231,
        majorSectionId: "dry_grocery_aisles",
        majorSectionLabel: "Dry grocery aisles",
        majorSubsection: "International foods",
        majorSectionOrder: 12,
        majorSectionItemOrder: 5
      },
      {
        rawText: "scallions",
        canonicalName: "scallions",
        normalizedName: "scallions",
        quantity: null,
        notes: null,
        categoryId: "produce",
        subcategoryId: "vegetables",
        orderHint: 12,
        majorSectionId: "produce",
        majorSectionLabel: "Produce",
        majorSubsection: "Conventional produce",
        majorSectionOrder: 2,
        majorSectionItemOrder: 3
      },
      {
        rawText: "coconut water",
        canonicalName: "coconut water",
        normalizedName: "coconut water",
        quantity: null,
        notes: null,
        categoryId: "beverages",
        subcategoryId: null,
        orderHint: 270,
        majorSectionId: "beverages",
        majorSectionLabel: "Beverages (often spans multiple aisles in larger stores)",
        majorSubsection: "Water and sparkling water",
        majorSectionOrder: 13,
        majorSectionItemOrder: 1
      }
    ]
  }
];

const basePrefs = {
  fontScale: 1,
  reduceMotion: false,
  highContrast: false,
  magicModeDefault: true
};

const baseStoragePayload = {
  [STORAGE_KEYS.prefs]: basePrefs,
  [STORAGE_KEYS.session]: mainSession,
  [STORAGE_KEYS.recentLists]: recentLists
};

const shots = [
  {
    name: "01-home-recent-lists",
    route: "/"
  },
  {
    name: "02-list-checklist",
    route: "/list"
  },
  {
    name: "03-list-show-picture",
    route: "/list",
    afterLoad: async (page) => {
      await page.getByRole("button", { name: "Show me the picture again" }).click();
      await page.getByRole("heading", { name: "Original List Photo" }).waitFor({ state: "visible" });
    }
  },
  {
    name: "04-review-edit",
    route: "/review"
  }
];

const captureShot = async (browser, shot, storagePayload) => {
  const context = await browser.newContext({
    ...devices["iPhone 14"]
  });

  await context.addInitScript((payload) => {
    window.localStorage.clear();
    for (const [key, value] of Object.entries(payload)) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }, storagePayload);

  const page = await context.newPage();
  await page.goto(`${BASE_URL}${shot.route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  if (shot.afterLoad) {
    await shot.afterLoad(page);
    await page.waitForTimeout(250);
  }

  const targetPath = path.join(OUTPUT_DIR, `${shot.name}.png`);
  await page.screenshot({
    path: targetPath
  });

  await context.close();
  return targetPath;
};

const run = async () => {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const sourceImage = await loadImageDataUrl();
  console.log(`Using marketing source image: ${sourceImage.sourcePath}`);
  const storagePayload = {
    ...baseStoragePayload,
    [STORAGE_KEYS.session]: {
      ...baseStoragePayload[STORAGE_KEYS.session],
      thumbnailDataUrl: sourceImage.dataUrl
    }
  };

  try {
    const written = [];
    for (const shot of shots) {
      const pathWritten = await captureShot(browser, shot, storagePayload);
      written.push(pathWritten);
    }

    console.log("Marketing screenshots created:");
    for (const item of written) {
      console.log(`- ${item}`);
    }
  } finally {
    await browser.close();
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
