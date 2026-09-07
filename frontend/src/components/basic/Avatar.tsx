import Image from "next/image";

export function Avatar({ src, alt, size = 40 }: { src?: string; alt: string; size?: number }) {
  if (!src) {
    const initials = alt
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    return (
      <span
        role="img"
        aria-label={alt}
        style={{ width: size, height: size }}
        className="inline-flex items-center justify-center rounded-full bg-secondary-blush text-primary-plum font-semibold"
      >
        {initials}
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="rounded-full object-cover"
    />
  );
}
