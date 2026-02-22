import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../app/routes";
import { useAppStore } from "../app/store";
import { TopBar } from "../components/TopBar";
import { PrimaryButton } from "../components/PrimaryButton";
import { categorizeItemName } from "../lib/categorize/categorize";
import { buildOrderedItems } from "../lib/order/itemOrder";
import { SECTION_LABELS, SECTION_ORDER } from "../lib/order/sectionOrder";
import {
  getMagicModePipelinePatch,
  mapMagicModeItems,
  requestMagicModeParse,
  shouldSuggestMagicMode
} from "../lib/ocr/magicMode";

export const Review = (): JSX.Element => {
  const navigate = useNavigate();
  const session = useAppStore((state) => state.session);
  const replaceItems = useAppStore((state) => state.replaceItems);
  const updateItem = useAppStore((state) => state.updateItem);
  const removeItem = useAppStore((state) => state.removeItem);
  const addItem = useAppStore((state) => state.addItem);
  const imageFile = useAppStore((state) => state.imageFile);
  const prefs = useAppStore((state) => state.prefs);
  const setPipeline = useAppStore((state) => state.setPipeline);
  const setExtractionResult = useAppStore((state) => state.setExtractionResult);
  const [newItem, setNewItem] = useState("");
  const [magicWarnings, setMagicWarnings] = useState<string[]>([]);
  const [magicError, setMagicError] = useState<string | null>(null);
  const [magicLoading, setMagicLoading] = useState(false);

  const items = session?.items ?? [];
  const suggestMagicMode = shouldSuggestMagicMode({
    userRequested: false,
    ocrConfidence: session?.ocrConfidence ?? 0,
    itemCount: items.length,
    imageLikelyNonBlank: Boolean(session?.imageHash)
  });

  const onBuildChecklist = (): void => {
    replaceItems(buildOrderedItems(items));
    navigate(ROUTES.list);
  };

  const onRunMagicMode = async (): Promise<void> => {
    if (!imageFile) {
      setMagicError("No image available. Choose a photo again.");
      return;
    }

    setMagicLoading(true);
    setMagicError(null);
    setPipeline({ ...getMagicModePipelinePatch(), error: null });

    try {
      const result = await requestMagicModeParse({
        imageBlob: imageFile,
        byoOpenAiKey: prefs.byoOpenAiKey,
        model: import.meta.env.VITE_OPENAI_MODEL
      });
      const mapped = mapMagicModeItems(result.items);
      replaceItems(buildOrderedItems(mapped));
      setExtractionResult({
        rawText: mapped.map((item) => item.rawText).join("\n"),
        ocrMeta: session?.ocrMeta ?? null,
        ocrConfidence: session?.ocrConfidence ?? 0.8,
        imageHash: session?.imageHash ?? null,
        thumbnailDataUrl: session?.thumbnailDataUrl ?? null,
        usedMagicMode: true
      });
      setMagicWarnings(result.warnings ?? []);
      setPipeline({ status: "review_ready", progress: 1, label: "Ready", error: null });
    } catch (error) {
      setMagicError(error instanceof Error ? error.message : "Magic Mode failed");
      setPipeline({ status: "review_ready", progress: 1, label: "Ready", error: null });
    } finally {
      setMagicLoading(false);
    }
  };

  const onAdd = (): void => {
    const trimmed = newItem.trim();
    if (!trimmed) {
      return;
    }
    addItem(trimmed);
    const category = categorizeItemName(trimmed);
    const created = useAppStore.getState().session?.items.at(-1);
    if (created) {
      updateItem(created.id, {
        canonicalName: category.canonicalName,
        normalizedName: category.normalizedName,
        categoryId: category.categoryId,
        subcategoryId: category.subcategoryId,
        orderHint: category.orderHint,
        confidence: category.confidence
      });
    }
    setNewItem("");
  };

  return (
    <main className="screen review-screen">
      <TopBar title={`Found ${items.length} items`} onLeftClick={() => navigate(ROUTES.landing)} leftLabel="Back" />
      {suggestMagicMode ? (
        <section className="magic-hint">
          <p>Handwriting? Magic Mode can help.</p>
          <button type="button" className="ghost-btn" onClick={() => void onRunMagicMode()} disabled={magicLoading}>
            {magicLoading ? "Running…" : "Re-run (Magic Mode)"}
          </button>
          {prefs.byoOpenAiKey ? null : (
            <p className="hint-text">If proxy mode is configured, your image is sent securely for AI parsing.</p>
          )}
          {magicError ? <p className="error-text">{magicError}</p> : null}
          {magicWarnings.length ? <p className="hint-text">{magicWarnings.join(" ")}</p> : null}
        </section>
      ) : null}
      <ul className="edit-list">
        {items.map((item) => (
          <li key={item.id} className="edit-row">
            <input
              aria-label={`Edit ${item.canonicalName}`}
              className="edit-input"
              value={item.canonicalName}
              onChange={(event) => {
                const next = event.target.value;
                const recat = categorizeItemName(next);
                updateItem(item.id, {
                  rawText: next,
                  canonicalName: next,
                  normalizedName: recat.normalizedName,
                  categoryId: recat.categoryId,
                  subcategoryId: recat.subcategoryId,
                  orderHint: recat.orderHint,
                  confidence: recat.confidence
                });
              }}
            />
            <select
              className="category-select"
              value={item.categoryId}
              aria-label={`Category for ${item.canonicalName}`}
              onChange={(event) => {
                updateItem(item.id, {
                  categoryId: event.target.value as typeof item.categoryId,
                  orderHint: null,
                  categoryOverridden: true,
                  majorSectionId: null,
                  majorSectionLabel: null,
                  majorSubsection: null,
                  majorSectionOrder: null,
                  majorSectionItemOrder: null
                });
              }}
            >
              {SECTION_ORDER.map((categoryId) => (
                <option key={categoryId} value={categoryId}>
                  {SECTION_LABELS[categoryId]}
                </option>
              ))}
            </select>
            <button type="button" className="delete-btn" onClick={() => removeItem(item.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      <div className="add-row">
        <input
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          placeholder="Add item"
          className="edit-input"
        />
        <button type="button" className="ghost-btn" onClick={onAdd}>
          Add
        </button>
      </div>
      <PrimaryButton label="Build checklist" onClick={onBuildChecklist} />
    </main>
  );
};
