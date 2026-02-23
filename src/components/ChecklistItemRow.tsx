import { useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { ShoppingItem } from "../app/types";

interface ChecklistItemRowProps {
  item: ShoppingItem;
  onToggle: (itemId: string) => void;
  onDismissSuggested?: (itemId: string) => void;
  onRemove?: (itemId: string) => void;
}

const SWIPE_TRIGGER_PX = 92;
const SWIPE_MAX_PX = 124;
const SWIPE_LOCK_PX = 10;

export const ChecklistItemRow = ({
  item,
  onToggle,
  onDismissSuggested,
  onRemove
}: ChecklistItemRowProps): JSX.Element => {
  const swipeEnabled = Boolean(onRemove);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const dragXRef = useRef(0);
  const swipeLockedRef = useRef(false);

  const setDrag = (value: number): void => {
    dragXRef.current = value;
    setDragX(value);
  };

  const clearGesture = (): void => {
    pointerIdRef.current = null;
    startXRef.current = null;
    startYRef.current = null;
    setIsDragging(false);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!swipeEnabled || event.pointerType === "mouse") {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest("input,button")) {
      return;
    }

    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    swipeLockedRef.current = false;
    setIsDragging(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional here.
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!swipeEnabled || pointerIdRef.current !== event.pointerId) {
      return;
    }
    const startX = startXRef.current;
    const startY = startYRef.current;
    if (startX === null || startY === null) {
      return;
    }

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaY) > SWIPE_LOCK_PX && Math.abs(deltaY) > Math.abs(deltaX)) {
      clearGesture();
      setDrag(0);
      return;
    }

    if (deltaX >= 0) {
      setDrag(0);
      return;
    }

    const next = Math.max(-SWIPE_MAX_PX, deltaX);
    if (Math.abs(next) > SWIPE_LOCK_PX) {
      swipeLockedRef.current = true;
    }
    setDrag(next);
  };

  const finalizeSwipe = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!swipeEnabled || pointerIdRef.current !== event.pointerId) {
      return;
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore release failures.
    }

    const shouldRemove = dragXRef.current <= -SWIPE_TRIGGER_PX;
    clearGesture();

    if (!shouldRemove) {
      setDrag(0);
      return;
    }

    setIsRemoving(true);
    setDrag(-SWIPE_MAX_PX);
    window.setTimeout(() => {
      onRemove?.(item.id);
      setIsRemoving(false);
      setDrag(0);
      swipeLockedRef.current = false;
    }, 120);
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!swipeEnabled || pointerIdRef.current !== event.pointerId) {
      return;
    }
    clearGesture();
    setDrag(0);
  };

  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>): void => {
    if (!swipeLockedRef.current) {
      return;
    }
    swipeLockedRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const rowStyle: CSSProperties = {
    transform: `translateX(${dragX}px)`
  };
  const gestureActive = isDragging || isRemoving;

  return (
    <div
      className={`check-row-shell ${swipeEnabled ? "swipe-enabled" : ""} ${gestureActive ? "gesture-active" : ""} ${isRemoving ? "removing" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finalizeSwipe}
      onPointerCancel={onPointerCancel}
      onClickCapture={onClickCapture}
    >
      <div className="check-row-delete-bg" aria-hidden>
        <span className="check-row-trash">🗑️</span>
      </div>
      <div
        className={`check-row ${item.checked ? "checked" : ""} ${item.suggested ? "suggested" : ""} ${isDragging ? "dragging" : ""}`}
        style={rowStyle}
      >
        <label className="check-main">
          <input
            type="checkbox"
            checked={item.checked}
            aria-label={`Toggle ${item.canonicalName}`}
            onChange={() => onToggle(item.id)}
          />
          <span className="check-text">
            {item.quantity ? <span className="check-qty">{item.quantity} </span> : null}
            {item.canonicalName}
            {item.notes ? <span className="check-notes"> ({item.notes})</span> : null}
          </span>
        </label>
        {item.suggested && onDismissSuggested ? (
          <button
            type="button"
            className="suggested-dismiss-btn"
            aria-label={`Dismiss suggested ${item.canonicalName}`}
            onClick={() => onDismissSuggested(item.id)}
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
};
