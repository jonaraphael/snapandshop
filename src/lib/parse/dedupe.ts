import type { ShoppingItem } from "../../app/types";

const mergeQuantity = (left: string | null, right: string | null): string | null => {
  if (left && right) {
    return left === right ? left : `${left} + ${right}`;
  }
  return left ?? right;
};

const mergeNotes = (left: string | null, right: string | null): string | null => {
  if (!left && !right) {
    return null;
  }
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  if (left === right) {
    return left;
  }

  const unique = new Set([left, right]);
  return Array.from(unique).join("; ");
};

export const dedupeItems = (items: ShoppingItem[]): ShoppingItem[] => {
  const byName = new Map<string, ShoppingItem>();

  for (const item of items) {
    const existing = byName.get(item.normalizedName);
    if (!existing) {
      byName.set(item.normalizedName, item);
      continue;
    }

    byName.set(item.normalizedName, {
      ...existing,
      quantity: mergeQuantity(existing.quantity, item.quantity),
      notes: mergeNotes(existing.notes, item.notes),
      confidence: Math.max(existing.confidence, item.confidence)
    });
  }

  return Array.from(byName.values());
};
