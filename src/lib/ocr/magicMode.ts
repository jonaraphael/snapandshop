import type { MagicModeResponse, PipelineState, ShoppingItem } from "../../app/types";
import { categorizeItemName } from "../categorize/categorize";
import { createId } from "../id";
import {
  MAJOR_SECTION_LABELS,
  MAJOR_SECTION_PROMPT_SCAFFOLD,
  MAJOR_SECTION_RANK,
  MAJOR_SECTION_TO_CATEGORY,
  MAJOR_SECTION_ORDER
} from "../order/majorSectionOrder";

export const MAGIC_SCHEMA_NAME = "shopping_list_extraction_v2";

const categoryEnum = [
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
] as const;

const parserSystemPrompt =
  "You are a grocery shopping list parser. Extract every distinct item from the photo of a shopping list. Preserve intent, separate quantity and notes, and classify every item using the provided store-layout scaffold.";

const parserUserInstructions = `Return one object per item.
- Split multiple items on one line.
- Never invent unseen items.
- If uncertain, include your best guess and add warning text.
- category_hint should be the best coarse aisle bucket for compatibility.
- Choose major_section only from the scaffold section IDs.
- Choose subsection from the scaffold subsection labels when possible, else null.
- within_section_order must be a 1-based integer for the item's relative order inside its major section.

Scaffold (major sections and in-section ordering reference):
${MAJOR_SECTION_PROMPT_SCAFFOLD}`;

export const MAGIC_OUTPUT_FORMAT = {
  type: "json_schema",
  name: MAGIC_SCHEMA_NAME,
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
            category_hint: {
              type: ["string", "null"],
              enum: [...categoryEnum, null]
            },
            major_section: {
              type: ["string", "null"],
              enum: [...MAJOR_SECTION_ORDER, null]
            },
            subsection: {
              type: ["string", "null"]
            },
            within_section_order: {
              type: ["integer", "null"],
              minimum: 1
            }
          }
        }
      },
      warnings: {
        type: "array",
        items: {
          type: "string"
        }
      }
    }
  }
} as const;

export interface MagicModeDecisionInput {
  userRequested: boolean;
  ocrConfidence: number;
  itemCount: number;
  imageLikelyNonBlank: boolean;
}

export const shouldSuggestMagicMode = ({
  userRequested,
  ocrConfidence,
  itemCount,
  imageLikelyNonBlank
}: MagicModeDecisionInput): boolean => {
  if (userRequested) {
    return true;
  }
  if (!imageLikelyNonBlank) {
    return false;
  }
  if (ocrConfidence < 0.55) {
    return true;
  }
  if (itemCount < 4 && imageLikelyNonBlank) {
    return true;
  }
  return false;
};

const blobToBase64 = async (blob: Blob): Promise<string> => {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not encode image"));
        return;
      }
      const [, payload = ""] = reader.result.split(",");
      resolve(payload);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not encode image"));
    reader.readAsDataURL(blob);
  });
};

const extractOutputText = (body: any): string => {
  if (typeof body?.output_text === "string" && body.output_text.trim()) {
    return body.output_text;
  }

  const output = Array.isArray(body?.output) ? body.output : [];
  for (const part of output) {
    const content = Array.isArray(part?.content) ? part.content : [];
    for (const block of content) {
      if (block?.type === "output_text" && typeof block.text === "string") {
        return block.text;
      }
      if (block?.type === "text" && typeof block.text === "string") {
        return block.text;
      }
    }
  }

  throw new Error("Magic Mode returned an unexpected response shape");
};

export const requestMagicModeParse = async (input: {
  imageBlob: Blob;
  byoOpenAiKey: string | null;
  model?: string;
  signal?: AbortSignal;
}): Promise<MagicModeResponse> => {
  const imageBase64 = await blobToBase64(input.imageBlob);

  if (input.byoOpenAiKey) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: input.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.byoOpenAiKey}`
      },
      body: JSON.stringify({
        model: input.model ?? "gpt-5.2",
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
                text: parserUserInstructions
              },
              {
                type: "input_image",
                image_url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high"
              }
            ]
          }
        ],
        text: {
          format: MAGIC_OUTPUT_FORMAT
        }
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Magic Mode request failed: ${response.status} ${body}`);
    }

    const body = await response.json();
    const outputText = extractOutputText(body);
    return JSON.parse(outputText) as MagicModeResponse;
  }

  const proxyResponse = await fetch("/api/vision-parse", {
    method: "POST",
    signal: input.signal,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      imageBase64,
      mimeType: input.imageBlob.type || "image/jpeg"
    })
  });

  if (!proxyResponse.ok) {
    const body = await proxyResponse.text();
    if (proxyResponse.status === 404) {
      throw new Error("Magic Mode proxy endpoint is not configured");
    }
    throw new Error(`Magic Mode proxy failed: ${proxyResponse.status} ${body}`);
  }

  return (await proxyResponse.json()) as MagicModeResponse;
};

export const mapMagicModeItems = (items: MagicModeResponse["items"]): ShoppingItem[] => {
  return items
    .filter((item) => item.canonical_name.trim())
    .map((item) => {
      const categorized = categorizeItemName(item.canonical_name);
      const sectionOrder =
        item.major_section && MAJOR_SECTION_RANK[item.major_section] !== undefined
          ? MAJOR_SECTION_RANK[item.major_section]
          : null;
      const withinSectionOrder =
        typeof item.within_section_order === "number" && Number.isFinite(item.within_section_order)
          ? Math.max(1, Math.floor(item.within_section_order))
          : null;
      const scaffoldCategory = item.major_section
        ? MAJOR_SECTION_TO_CATEGORY[item.major_section]
        : null;
      const sectionOrderHint =
        sectionOrder !== null
          ? sectionOrder * 1000 + (withinSectionOrder ?? 999)
          : null;
      const notes = item.notes?.trim() ? item.notes : null;
      const subsection = item.subsection?.trim() ? item.subsection.trim() : null;

      return {
        id: createId(),
        rawText: item.raw_text,
        canonicalName: categorized.canonicalName,
        normalizedName: categorized.normalizedName,
        quantity: item.quantity,
        notes,
        categoryId: item.category_hint ?? scaffoldCategory ?? categorized.categoryId,
        subcategoryId: categorized.subcategoryId,
        orderHint: sectionOrderHint ?? categorized.orderHint,
        checked: false,
        confidence: 0.95,
        source: "magic",
        categoryOverridden: false,
        majorSectionId: item.major_section,
        majorSectionLabel: item.major_section ? MAJOR_SECTION_LABELS[item.major_section] : null,
        majorSubsection: subsection,
        majorSectionOrder: sectionOrder,
        majorSectionItemOrder: withinSectionOrder
      };
    });
};

export const getMagicModePipelinePatch = (): Partial<PipelineState> => ({
  status: "ocr",
  progress: 0.35,
  label: "Handwriting mode: parsing"
});
