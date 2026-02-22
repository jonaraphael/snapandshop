export interface QuantityParseResult {
  name: string;
  quantity: string | null;
  notes: string | null;
}

const LEADING_QUANTITY = /^\s*(\d+(?:\.\d+)?|\d+\/\d+)\s*(?:x|×)?\s+/i;
const TRAILING_UNIT = /\b(\d+(?:\.\d+)?\s?(?:lb|lbs|oz|g|kg|ml|l|pack|pkg|ct))\b/i;
const PAREN_NOTES = /\(([^)]+)\)\s*$/;

export const parseQuantityAndNotes = (line: string): QuantityParseResult => {
  let working = line.trim();
  let quantity: string | null = null;
  let notes: string | null = null;

  const notesMatch = working.match(PAREN_NOTES);
  if (notesMatch) {
    notes = notesMatch[1].trim();
    working = working.replace(PAREN_NOTES, "").trim();
  }

  const leadingMatch = working.match(LEADING_QUANTITY);
  if (leadingMatch) {
    quantity = leadingMatch[1];
    working = working.slice(leadingMatch[0].length).trim();
  }

  const trailingUnitMatch = working.match(TRAILING_UNIT);
  if (trailingUnitMatch) {
    quantity = quantity ? `${quantity} ${trailingUnitMatch[1]}` : trailingUnitMatch[1];
    working = working.replace(TRAILING_UNIT, "").trim();
  }

  return {
    name: working,
    quantity,
    notes
  };
};
