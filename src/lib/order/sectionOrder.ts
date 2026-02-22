import type { CategoryId, Section, ShoppingItem } from "../../app/types";
import { MAJOR_SECTION_LABELS, MAJOR_SECTION_RANK } from "./majorSectionOrder";

export const SECTION_ORDER: CategoryId[] = [
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

export const SECTION_LABELS: Record<CategoryId, string> = {
  produce: "Produce",
  bakery: "Bakery",
  deli: "Deli",
  meat_seafood: "Meat & Seafood",
  dairy_eggs: "Dairy & Eggs",
  frozen: "Frozen",
  pantry: "Pantry",
  snacks: "Snacks",
  beverages: "Beverages",
  household: "Household",
  personal_care: "Personal Care",
  pet: "Pet",
  other: "Other"
};

const categoryRank = SECTION_ORDER.reduce<Record<CategoryId, number>>((acc, categoryId, index) => {
  acc[categoryId] = index;
  return acc;
}, {} as Record<CategoryId, number>);

export const buildSections = (items: ShoppingItem[]): Section[] => {
  const buckets = new Map<
    string,
    {
      id: string;
      title: string;
      rank: number;
      items: ShoppingItem[];
    }
  >();

  for (const item of items) {
    const hasMajorSection =
      typeof item.majorSectionId === "string" &&
      item.majorSectionId in MAJOR_SECTION_LABELS;

    const sectionId = hasMajorSection && item.majorSectionId ? item.majorSectionId : item.categoryId;
    const title =
      hasMajorSection && item.majorSectionId
        ? item.majorSectionLabel ?? MAJOR_SECTION_LABELS[item.majorSectionId]
        : SECTION_LABELS[item.categoryId];
    const rank =
      hasMajorSection && item.majorSectionId
        ? item.majorSectionOrder ?? MAJOR_SECTION_RANK[item.majorSectionId]
        : 1000 + categoryRank[item.categoryId];

    const existing = buckets.get(sectionId);
    if (existing) {
      if (hasMajorSection && item.majorSectionId) {
        existing.title = item.majorSectionLabel ?? MAJOR_SECTION_LABELS[item.majorSectionId];
        existing.rank = Math.min(existing.rank, rank);
      }
      existing.items.push(item);
      continue;
    }

    buckets.set(sectionId, {
      id: sectionId,
      title,
      rank,
      items: [item]
    });
  }

  const orderedBuckets = Array.from(buckets.values()).sort((left, right) => {
    if (left.rank !== right.rank) {
      return left.rank - right.rank;
    }
    return left.title.localeCompare(right.title);
  });

  const sections: Section[] = orderedBuckets.map((bucket) => ({
    id: bucket.id,
    title: bucket.title,
    items: bucket.items,
    remainingCount: bucket.items.filter((item) => !item.checked).length,
    completedAt: null
  }));

  return sections;
};
