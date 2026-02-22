export type CategoryId =
  | "produce"
  | "bakery"
  | "deli"
  | "meat_seafood"
  | "dairy_eggs"
  | "frozen"
  | "pantry"
  | "snacks"
  | "beverages"
  | "household"
  | "personal_care"
  | "pet"
  | "other";

export type MajorSectionId =
  | "entry_front_of_store"
  | "produce"
  | "bakery"
  | "prepared_foods_and_deli_cluster"
  | "cheese_and_specialty_dairy"
  | "meat_and_poultry"
  | "seafood"
  | "perimeter_refrigerated_wall"
  | "frozen"
  | "alcohol"
  | "dry_grocery_aisles"
  | "bulk_foods"
  | "beverages"
  | "health_and_wellness"
  | "pharmacy"
  | "personal_care_and_beauty"
  | "baby_and_family"
  | "household_and_cleaning"
  | "pet"
  | "home_goods_and_seasonal"
  | "office_and_school"
  | "electronics_and_media"
  | "apparel"
  | "automotive"
  | "sports_fitness_and_outdoors"
  | "books_cards_and_party"
  | "services_and_specialty_counters"
  | "checkout_exit";

export interface ShoppingItem {
  id: string;
  rawText: string;
  canonicalName: string;
  normalizedName: string;
  quantity: string | null;
  notes: string | null;
  categoryId: CategoryId;
  subcategoryId: string | null;
  orderHint: number | null;
  checked: boolean;
  confidence: number;
  source: "ocr" | "magic" | "manual";
  categoryOverridden: boolean;
  majorSectionId?: MajorSectionId | null;
  majorSectionLabel?: string | null;
  majorSubsection?: string | null;
  majorSectionOrder?: number | null;
  majorSectionItemOrder?: number | null;
}

export interface Section {
  id: string;
  title: string;
  items: ShoppingItem[];
  remainingCount: number;
  completedAt: string | null;
}

export interface OcrMeta {
  meanConfidence: number;
  wordCount: number;
  lineCount: number;
  timeMs: number;
  garbageLineRatio: number;
}

export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  imageHash: string | null;
  thumbnailDataUrl: string | null;
  rawText: string;
  ocrConfidence: number;
  ocrMeta: OcrMeta | null;
  usedMagicMode: boolean;
  items: ShoppingItem[];
}

export interface UiPrefs {
  fontScale: number;
  reduceMotion: boolean;
  highContrast: boolean;
  magicModeDefault: boolean;
  byoOpenAiKey: string | null;
}

export type PipelineStatus =
  | "idle"
  | "image_selected"
  | "preprocess"
  | "ocr"
  | "parse_lines"
  | "normalize"
  | "categorize"
  | "order"
  | "review_ready"
  | "error";

export interface PipelineState {
  status: PipelineStatus;
  progress: number;
  label: string;
  error: string | null;
}

export interface ParsedItem {
  rawText: string;
  canonicalName: string;
  quantity: string | null;
  notes: string | null;
}

export interface MagicModeResponse {
  items: Array<{
    raw_text: string;
    canonical_name: string;
    quantity: string | null;
    notes: string | null;
    category_hint: CategoryId | null;
    major_section: MajorSectionId | null;
    subsection: string | null;
    within_section_order: number | null;
  }>;
  warnings: string[];
}
