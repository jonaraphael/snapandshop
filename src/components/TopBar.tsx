interface TopBarProps {
  title: string;
  leftLabel?: string;
  rightLabel?: string;
  onLeftClick?: () => void;
  onRightClick?: () => void;
}

export const TopBar = ({
  title,
  leftLabel,
  rightLabel,
  onLeftClick,
  onRightClick
}: TopBarProps): JSX.Element => {
  return (
    <header className="top-bar">
      <div className="top-bar-side">
        {leftLabel ? (
          <button type="button" className="link-btn" onClick={onLeftClick}>
            {leftLabel}
          </button>
        ) : null}
      </div>
      <h1 className="top-bar-title">{title}</h1>
      <div className="top-bar-side align-right">
        {rightLabel ? (
          <button type="button" className="link-btn" onClick={onRightClick}>
            {rightLabel}
          </button>
        ) : null}
      </div>
    </header>
  );
};
