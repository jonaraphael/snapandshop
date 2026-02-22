interface PrimaryButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  testId?: string;
}

export const PrimaryButton = ({
  label,
  onClick,
  variant = "primary",
  disabled = false,
  testId
}: PrimaryButtonProps): JSX.Element => {
  return (
    <button
      type="button"
      className={variant === "primary" ? "primary-btn" : "secondary-btn"}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
    >
      {label}
    </button>
  );
};
