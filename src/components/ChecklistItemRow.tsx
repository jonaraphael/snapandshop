import type { ShoppingItem } from "../app/types";

interface ChecklistItemRowProps {
  item: ShoppingItem;
  onToggle: (itemId: string) => void;
}

export const ChecklistItemRow = ({ item, onToggle }: ChecklistItemRowProps): JSX.Element => {
  return (
    <label className={`check-row ${item.checked ? "checked" : ""}`}>
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
  );
};
