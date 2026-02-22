import type { CategoryId, ShoppingItem } from "../../app/types";
import { SECTION_ORDER } from "./sectionOrder";

const categoryRank = SECTION_ORDER.reduce<Record<CategoryId, number>>((acc, id, index) => {
  acc[id] = index;
  return acc;
}, {} as Record<CategoryId, number>);

const subcategoryRank: Record<string, number> = {
  fruit: 0,
  vegetables: 1,
  salad_greens: 2,
  herbs: 3,
  bread: 0,
  tortillas: 1,
  pastries: 2,
  milk: 0,
  eggs: 1,
  yogurt: 2,
  cheese: 3,
  butter: 4,
  canned: 0,
  pasta_rice: 1,
  baking: 2,
  spices: 3,
  condiments: 4,
  breakfast: 5
};

const rankSubcategory = (value: string | null): number => {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }
  return subcategoryRank[value] ?? Number.POSITIVE_INFINITY;
};

export const buildOrderedItems = (items: ShoppingItem[]): ShoppingItem[] => {
  return [...items].sort((left, right) => {
    const leftMajorOrder =
      typeof left.majorSectionOrder === "number" ? left.majorSectionOrder : null;
    const rightMajorOrder =
      typeof right.majorSectionOrder === "number" ? right.majorSectionOrder : null;

    if (leftMajorOrder !== null || rightMajorOrder !== null) {
      if (leftMajorOrder === null) {
        return 1;
      }
      if (rightMajorOrder === null) {
        return -1;
      }
      if (leftMajorOrder !== rightMajorOrder) {
        return leftMajorOrder - rightMajorOrder;
      }

      const leftWithin =
        typeof left.majorSectionItemOrder === "number" ? left.majorSectionItemOrder : Number.POSITIVE_INFINITY;
      const rightWithin =
        typeof right.majorSectionItemOrder === "number"
          ? right.majorSectionItemOrder
          : Number.POSITIVE_INFINITY;
      if (leftWithin !== rightWithin) {
        return leftWithin - rightWithin;
      }
    }

    const catDiff = categoryRank[left.categoryId] - categoryRank[right.categoryId];
    if (catDiff !== 0) {
      return catDiff;
    }

    const leftOrderHint = left.orderHint ?? Number.POSITIVE_INFINITY;
    const rightOrderHint = right.orderHint ?? Number.POSITIVE_INFINITY;
    if (leftOrderHint !== rightOrderHint) {
      return leftOrderHint - rightOrderHint;
    }

    const subDiff = rankSubcategory(left.subcategoryId) - rankSubcategory(right.subcategoryId);
    if (subDiff !== 0) {
      return subDiff;
    }

    return left.canonicalName.localeCompare(right.canonicalName);
  });
};
