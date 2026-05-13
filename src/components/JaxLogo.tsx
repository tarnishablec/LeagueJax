const logoUrls = {
  transparent: new URL("../assets/fish_2_transparent_512.png", import.meta.url)
    .href,
  dark: new URL("../assets/fish_2_dark_512.png", import.meta.url).href,
} as const;

type JaxLogoVariant = keyof typeof logoUrls;

export function JaxLogo({
  size = 32,
  className,
  variant = "transparent",
}: {
  size?: number;
  className?: string;
  variant?: JaxLogoVariant;
}) {
  return (
    <img
      src={logoUrls[variant]}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={className}
    />
  );
}
