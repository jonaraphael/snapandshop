import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../app/routes";
import { useAppStore } from "../app/store";
import { TopBar } from "../components/TopBar";
import { SectionCard } from "../components/SectionCard";
import { TextSizeControl } from "../components/TextSizeControl";
import { buildSections } from "../lib/order/sectionOrder";

export const List = (): JSX.Element => {
  const navigate = useNavigate();
  const session = useAppStore((state) => state.session);
  const toggleItem = useAppStore((state) => state.toggleItem);
  const resetForNewList = useAppStore((state) => state.resetForNewList);
  const [showTextSize, setShowTextSize] = useState(false);

  const sections = useMemo(() => buildSections(session?.items ?? []), [session?.items]);
  const itemsLeft = useMemo(
    () => (session?.items ?? []).filter((item) => !item.checked).length,
    [session?.items]
  );

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

      <div className="list-actions">
        <button type="button" className="ghost-btn" onClick={() => navigate(ROUTES.review)}>
          Edit
        </button>
      </div>

      <section className="sections-wrap">
        {sections.map((section) => (
          <SectionCard key={section.id} section={section} onToggleItem={toggleItem} />
        ))}
      </section>

      <TextSizeControl open={showTextSize} onClose={() => setShowTextSize(false)} />
    </main>
  );
};
