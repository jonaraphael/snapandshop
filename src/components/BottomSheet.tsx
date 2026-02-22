import { ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export const BottomSheet = ({ open, title, onClose, children }: BottomSheetProps): JSX.Element | null => {
  if (!open) {
    return null;
  }

  return (
    <div className="sheet-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="sheet-backdrop" onClick={onClose} aria-label="Close" />
      <section className="sheet-panel">
        <div className="sheet-header">
          <h2>{title}</h2>
          <button type="button" className="link-btn" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </section>
    </div>
  );
};
