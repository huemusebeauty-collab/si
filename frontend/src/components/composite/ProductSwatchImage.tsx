import type { Product } from "@/types/product";

export function ProductSwatchImage({ product, className = "" }: { product: Product; className?: string }) {
  const colors = product.shades.length > 0 ? product.shades.map((s) => s.hex) : ["#D9B8A3"];

  const background =
    colors.length === 1
      ? colors[0]
      : `linear-gradient(135deg, ${colors.map((c, i) => `${c} ${(i / colors.length) * 100}%, ${c} ${((i + 1) / colors.length) * 100}%`).join(", ")})`;

  return (
    <div
      role="img"
      aria-label={product.imageAlt}
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ background }}
    >
      <div className="flex gap-1.5 rounded-full bg-white/85 px-3 py-1.5 shadow-sm backdrop-blur-sm">
        {colors.slice(0, 4).map((c, i) => (
          <span
            key={`${c}-${i}`}
            className="h-4 w-4 rounded-full border border-black/10"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}
