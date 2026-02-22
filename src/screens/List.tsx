import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../app/routes";
import { useAppStore } from "../app/store";
import { TopBar } from "../components/TopBar";
import { SectionCard } from "../components/SectionCard";
import { BottomSheet } from "../components/BottomSheet";
import { TextSizeControl } from "../components/TextSizeControl";
import { buildSections } from "../lib/order/sectionOrder";
import type { RecentListItem } from "../app/types";

export const List = (): JSX.Element => {
  const navigate = useNavigate();
  const session = useAppStore((state) => state.session);
  const imagePreviewUrl = useAppStore((state) => state.imagePreviewUrl);
  const recentLists = useAppStore((state) => state.recentLists);
  const toggleItem = useAppStore((state) => state.toggleItem);
  const addSuggestedItems = useAppStore((state) => state.addSuggestedItems);
  const dismissSuggestedItem = useAppStore((state) => state.dismissSuggestedItem);
  const resetForNewList = useAppStore((state) => state.resetForNewList);
  const [showTextSize, setShowTextSize] = useState(false);
  const [showImageSheet, setShowImageSheet] = useState(false);
  const sourceImageUrl = imagePreviewUrl ?? session?.thumbnailDataUrl ?? null;
  const activeListTitle = session?.listTitle?.trim() || "Shopping list";

  const sections = useMemo(() => buildSections(session?.items ?? []), [session?.items]);
  const itemsLeft = useMemo(
    () => (session?.items ?? []).filter((item) => !item.checked).length,
    [session?.items]
  );
  const suggestionsBySection = useMemo(() => {
    const currentItems = session?.items ?? [];
    const currentNames = new Set(currentItems.map((item) => item.normalizedName));
    const sectionToSuggestions = new Map<string, Map<string, RecentListItem & { count: number }>>();

    for (const recent of recentLists) {
      const seenThisList = new Set<string>();
      for (const item of recent.items) {
        if (!item.normalizedName || currentNames.has(item.normalizedName)) {
          continue;
        }

        const sectionId = item.majorSectionId ?? item.categoryId;
        const uniqueKey = `${sectionId}:${item.normalizedName}`;
        if (seenThisList.has(uniqueKey)) {
          continue;
        }
        seenThisList.add(uniqueKey);

        const sectionMap = sectionToSuggestions.get(sectionId) ?? new Map<string, RecentListItem & { count: number }>();
        const existing = sectionMap.get(item.normalizedName);
        if (existing) {
          existing.count += 1;
        } else {
          sectionMap.set(item.normalizedName, {
            ...item,
            count: 1
          });
        }
        sectionToSuggestions.set(sectionId, sectionMap);
      }
    }

    const sorted = new Map<string, RecentListItem[]>();
    for (const [sectionId, itemMap] of sectionToSuggestions.entries()) {
      const ordered = Array.from(itemMap.values())
        .sort((left, right) => {
          if (right.count !== left.count) {
            return right.count - left.count;
          }
          return left.canonicalName.localeCompare(right.canonicalName);
        })
        .map(({ count, ...item }) => item);
      if (ordered.length) {
        sorted.set(sectionId, ordered);
      }
    }
    return sorted;
  }, [recentLists, session?.items]);

  const onSuggestMore = (sectionId: string): void => {
    const next = suggestionsBySection.get(sectionId) ?? [];
    if (!next.length) {
      return;
    }
    addSuggestedItems(next.slice(0, 3));
  };

  return (
    <main className="screen list-screen">
      <TopBar
        title={`${itemsLeft} left`}
        leftLabel="New"
        onLeftClick={() => {
          if (window.confirm("Start a new list?")) {
            resetForNewList();
            navigate(ROUTES.landing);
          }
        }}
        rightLabel="Aa"
        onRightClick={() => setShowTextSize(true)}
      />
      <header className="list-title-block">
        <h1 className="list-title">{activeListTitle}</h1>
      </header>

      <div className="list-actions">
        <button
          type="button"
          className="ghost-btn"
          disabled={!sourceImageUrl}
          onClick={() => setShowImageSheet(true)}
        >
          Show me the picture again
        </button>
        <button type="button" className="ghost-btn" onClick={() => navigate(ROUTES.review)}>
          Edit
        </button>
      </div>

      <section className="sections-wrap">
        {sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            onToggleItem={toggleItem}
            onDismissSuggestedItem={dismissSuggestedItem}
            suggestionCount={suggestionsBySection.get(section.id)?.length ?? 0}
            onSuggestMore={() => onSuggestMore(section.id)}
          />
        ))}
      </section>

      <TextSizeControl open={showTextSize} onClose={() => setShowTextSize(false)} />
      <BottomSheet open={showImageSheet} title="Original List Photo" onClose={() => setShowImageSheet(false)}>
        {sourceImageUrl ? (
          <div className="source-image-wrap">
            <img
              src={sourceImageUrl}
              alt="Original uploaded shopping list"
              className="source-image"
              loading="lazy"
            />
          </div>
        ) : (
          <p className="hint-text">No uploaded image is available for this list.</p>
        )}
      </BottomSheet>
    </main>
  );
};
