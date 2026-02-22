import type { ShoppingItem } from "../app/types";

interface ChecklistItemRowProps {
  item: ShoppingItem;
  onToggle: (itemId: string) => void;
  onDismissSuggested?: (itemId: string) => void;
}

export const ChecklistItemRow = ({
  item,
  onToggle,
  onDismissSuggested
}: ChecklistItemRowProps): JSX.Element => {
  return (
    <div className={`check-row ${item.checked ? "checked" : ""} ${item.suggested ? "suggested" : ""}`}>
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
  );
};
