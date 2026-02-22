import type { ReactNode } from "react";

interface PrimaryButtonProps {
  label: ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  testId?: string;
  ariaLabel?: string;
}

export const PrimaryButton = ({
  label,
  onClick,
  variant = "primary",
  disabled = false,
  testId,
  ariaLabel
}: PrimaryButtonProps): JSX.Element => {
  return (
    <button
      type="button"
      className={variant === "primary" ? "primary-btn" : "secondary-btn"}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      aria-label={ariaLabel}
    >
      {label}
    </button>
  );
};
