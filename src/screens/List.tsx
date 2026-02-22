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

const ImageIcon = (): JSX.Element => (
  <svg className="header-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <path d="M7 15l3-3 2.5 2.2L16 10l3 5" />
    <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

const EditIcon = (): JSX.Element => (
  <svg className="header-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M4.5 16.6l-.8 3.1 3.1-.8L16.5 9l-2.3-2.3z" />
    <path d="M14.8 6.7l2.3 2.3 1.7-1.7a1.6 1.6 0 0 0 0-2.3l-.1-.1a1.6 1.6 0 0 0-2.3 0z" />
  </svg>
);

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
          resetForNewList();
          navigate(ROUTES.landing);
        }}
        rightContent={
          <div className="header-icon-row">
            <button
              type="button"
              className="header-icon-btn"
              disabled={!sourceImageUrl}
              aria-label="Show me the picture again"
              onClick={() => setShowImageSheet(true)}
            >
              <ImageIcon />
            </button>
            <button
              type="button"
              className="header-icon-btn"
              aria-label="Edit list"
              onClick={() => navigate(ROUTES.review)}
            >
              <EditIcon />
            </button>
            <button
              type="button"
              className="header-icon-btn header-icon-text-btn"
              aria-label="Text size"
              onClick={() => setShowTextSize(true)}
            >
              Aa
            </button>
          </div>
        }
      />
      <header className="list-title-block">
        <h1 className="list-title">{activeListTitle}</h1>
      </header>

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
