import Link from "next/link";
import { Badge } from "@/components/basic/Badge";
import { Icon } from "@/components/basic/Icon";
import type { Product } from "@/types/product";
import { ROUTES } from "@/constants/routes";
import { formatCurrency } from "@/utils/formatCurrency";
import { ProductSwatchImage } from "@/components/composite/ProductSwatchImage";

export function ProductCard({ product }: { product: Product }) {
  const isOutOfStock = product.availability === "out-of-stock";

  return (
    <article className="group relative flex flex-col rounded-md bg-white shadow-rest transition-shadow duration-base hover:shadow-hover">
      <Link href={ROUTES.product(product.slug)} className="block">
        <div className="relative aspect-square overflow-hidden rounded-t-md bg-paper">
          <ProductSwatchImage product={product} className="absolute inset-0" />
          {product.badges.length > 0 && (
            <div className="absolute left-2 top-2 flex flex-col gap-1">
              {product.badges.map((b) => (
                <Badge key={b} tone={b.toLowerCase().replace(/\s+/g, "-") as never}>
                  {b}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Link>

      <button
        type="button"
        aria-label={`Quick add ${product.name} to cart`}
        disabled={isOutOfStock}
        className="absolute right-2 top-2 rounded-full bg-white p-2 shadow-rest text-charcoal hover:text-primary-rose disabled:opacity-40"
      >
        <Icon size={20} label="" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </Icon>
      </button>

      <div className="flex flex-col gap-1 p-4">
        <Link href={ROUTES.product(product.slug)}>
          <h3 className="font-interface text-[16px] leading-[22px] font-semibold text-ink">
            {product.name}
          </h3>
        </Link>
        {product.shadeCount ? (
          <p className="text-[13px] leading-[18px] text-stone">{product.shadeCount} shades</p>
        ) : null}
        <div className="flex items-baseline gap-2">
          {product.salePrice ? (
            <>
              <span className="text-[20px] leading-6 font-semibold text-primary-rose">
                {formatCurrency(product.salePrice, product.currency)}
              </span>
              <span className="text-[13px] leading-[18px] text-stone line-through">
                {formatCurrency(product.price, product.currency)}
              </span>
            </>
          ) : (
            <span className="text-[20px] leading-6 font-semibold text-ink">
              {formatCurrency(product.price, product.currency)}
            </span>
          )}
        </div>
        <AvailabilityLabel status={product.availability} />
      </div>
    </article>
  );
}

function AvailabilityLabel({ status }: { status: Product["availability"] }) {
  const map = {
    "in-stock": { text: "In Stock", color: "bg-success" },
    "low-stock": { text: "Low Stock", color: "bg-warning" },
    "out-of-stock": { text: "Out of Stock", color: "bg-error" },
    "coming-soon": { text: "Coming Soon", color: "bg-information" },
    "pre-order": { text: "Pre-order", color: "bg-information" },
  } as const;
  const { text, color } = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] leading-[18px] text-stone">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} aria-hidden="true" />
      {text}
    </span>
  );
}
