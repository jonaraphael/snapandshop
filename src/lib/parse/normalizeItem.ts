const OCR_FIXES: Record<string, string> = {
  miik: "milk",
  mi1k: "milk",
  "1ime": "lime",
  bannana: "banana",
  banannas: "bananas",
  app1e: "apple",
  y0gurt: "yogurt"
};

const SINGULAR_EXCEPTIONS = new Set(["eggs", "chips", "greens", "beans"]);

const singularize = (value: string): string => {
  if (SINGULAR_EXCEPTIONS.has(value)) {
    return value;
  }

  if (value.endsWith("ies") && value.length > 3) {
    return `${value.slice(0, -3)}y`;
  }

  if (value.endsWith("s") && !value.endsWith("ss") && value.length > 3) {
    return value.slice(0, -1);
  }

  return value;
};

export interface NormalizedName {
  canonicalName: string;
  normalizedName: string;
}

export const normalizeName = (value: string): NormalizedName => {
  const canonicalName = value.trim().replace(/[.,;:!?]+$/g, "");
  const lowered = canonicalName.toLowerCase().replace(/\s+/g, " ");
  const fixed = lowered
    .split(" ")
    .map((token) => OCR_FIXES[token] ?? token)
    .join(" ");
  const normalizedName = singularize(fixed);

  return {
    canonicalName,
    normalizedName
  };
};
