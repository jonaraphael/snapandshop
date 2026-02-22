import type { ReactNode } from "react";

interface TopBarProps {
  title: string;
  leftLabel?: string;
  rightLabel?: string;
  onLeftClick?: () => void;
  onRightClick?: () => void;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
}

export const TopBar = ({
  title,
  leftLabel,
  rightLabel,
  onLeftClick,
  onRightClick,
  leftContent,
  rightContent
}: TopBarProps): JSX.Element => {
  return (
    <header className="top-bar">
      <div className="top-bar-side">
        {leftContent ? (
          leftContent
        ) : leftLabel ? (
          <button type="button" className="link-btn" onClick={onLeftClick}>
            {leftLabel}
          </button>
        ) : null}
      </div>
      <h1 className="top-bar-title">{title}</h1>
      <div className="top-bar-side align-right">
        {rightContent ? (
          rightContent
        ) : rightLabel ? (
          <button type="button" className="link-btn" onClick={onRightClick}>
            {rightLabel}
          </button>
        ) : null}
      </div>
    </header>
  );
};
