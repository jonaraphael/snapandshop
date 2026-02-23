interface BrandLogoProps {
  size?: number;
  className?: string;
  decorative?: boolean;
}

export const BrandLogo = ({
  size = 40,
  className = "",
  decorative = false
}: BrandLogoProps): JSX.Element => {
  const src = `${import.meta.env.BASE_URL}icons/icon-192.png`;

  return (
    <img
      src={src}
      width={size}
      height={size}
      className={`brand-logo ${className}`.trim()}
      alt={decorative ? "" : "Snap&Shop logo"}
      aria-hidden={decorative ? true : undefined}
      loading="eager"
      decoding="async"
      draggable={false}
    />
  );
};
