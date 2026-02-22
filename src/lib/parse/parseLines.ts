const NOISE_ONLY = /^[\s\p{P}]+$/u;
const LEADING_MARKERS = /^\s*(?:[-*•]+|\[[ xX]?\]|☐|□|\d+[.)]|\(\d+\)|[.#?]+)\s*/u;

const likelyMultipleItems = (line: string): boolean => {
  if (!line.includes(",") && !line.includes(";")) {
    return false;
  }

  const tokenCount = line
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean).length;

  return tokenCount > 1;
};

export const parseRawLines = (rawText: string): string[] => {
  const candidates = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !NOISE_ONLY.test(line))
    .map((line) => line.replace(LEADING_MARKERS, "").trim())
    .filter(Boolean);

  const result: string[] = [];

  for (const line of candidates) {
    if (!likelyMultipleItems(line)) {
      result.push(line);
      continue;
    }

    const split = line
      .split(/[;,]/)
      .map((token) => token.trim())
      .filter(Boolean);

    if (split.length <= 1) {
      result.push(line);
      continue;
    }

    result.push(...split);
  }

  return result;
};
