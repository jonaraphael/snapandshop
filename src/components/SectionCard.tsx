import { useEffect, useRef, useState } from "react";
import type { Section } from "../app/types";
import { ChecklistItemRow } from "./ChecklistItemRow";
import { ConfettiBurst } from "./ConfettiBurst";
import { useAppStore } from "../app/store";

interface SectionCardProps {
  section: Section;
  onToggleItem: (itemId: string) => void;
  onDismissSuggestedItem?: (itemId: string) => void;
  onRemoveItem?: (itemId: string) => void;
  suggestionCount?: number;
  onSuggestMore?: () => void;
}

export const SectionCard = ({
  section,
  onToggleItem,
  onDismissSuggestedItem,
  onRemoveItem,
  suggestionCount = 0,
  onSuggestMore
}: SectionCardProps): JSX.Element => {
  const prevRemaining = useRef(section.remainingCount);
  const [celebrationCount, setCelebrationCount] = useState(0);
  const [showDone, setShowDone] = useState(false);
  const reduceMotion = useAppStore((state) => state.prefs.reduceMotion);

  useEffect(() => {
    const completedNow = prevRemaining.current > 0 && section.remainingCount === 0 && section.items.length > 0;
    prevRemaining.current = section.remainingCount;

    if (!completedNow) {
      return;
    }

    if (!reduceMotion && "vibrate" in navigator) {
      navigator.vibrate(150);
    }

    setCelebrationCount((value) => value + 1);
    setShowDone(true);

    const timer = window.setTimeout(() => {
      setShowDone(false);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [reduceMotion, section.items.length, section.remainingCount]);

  return (
    <article className="section-card">
      <header className="section-header">
        <h2>{section.title}</h2>
        <div className="section-meta">
          {suggestionCount > 0 && onSuggestMore ? (
            <button type="button" className="section-suggest-btn" onClick={onSuggestMore}>
              Suggest more
            </button>
          ) : null}
          <span className="section-count">{showDone ? "Done!" : `${section.remainingCount} left`}</span>
        </div>
      </header>
      <ConfettiBurst trigger={celebrationCount} disabled={reduceMotion} />
      <div className="section-items">
        {section.items.map((item) => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            onToggle={onToggleItem}
            onDismissSuggested={onDismissSuggestedItem}
            onRemove={onRemoveItem}
          />
        ))}
      </div>
    </article>
  );
};
