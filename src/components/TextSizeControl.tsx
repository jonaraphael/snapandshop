import { BottomSheet } from "./BottomSheet";
import { useAppStore } from "../app/store";

interface TextSizeControlProps {
  open: boolean;
  onClose: () => void;
}

export const TextSizeControl = ({ open, onClose }: TextSizeControlProps): JSX.Element => {
  const fontScale = useAppStore((state) => state.prefs.fontScale);
  const setPrefs = useAppStore((state) => state.setPrefs);

  return (
    <BottomSheet open={open} onClose={onClose} title="Text size">
      <label htmlFor="font-scale" className="input-label">
        Adjust text size
      </label>
      <input
        id="font-scale"
        type="range"
        min={0.9}
        max={1.6}
        step={0.05}
        value={fontScale}
        onChange={(event) => setPrefs({ fontScale: Number(event.target.value) })}
        className="slider"
      />
      <p className="hint-text">{Math.round(fontScale * 100)}%</p>
    </BottomSheet>
  );
};
