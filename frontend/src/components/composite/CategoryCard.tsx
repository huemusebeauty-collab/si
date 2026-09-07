import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/types/product";
import { ROUTES } from "@/constants/routes";

// Category Card — Phase 4 §8. Used in homepage category discovery + mega menu.
export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={ROUTES.category(category.slug)}
      className="group flex flex-col rounded-md bg-white shadow-rest transition-shadow duration-base hover:shadow-hover"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-md bg-paper">
        <Image
          src={category.imageUrl}
          alt={category.imageAlt}
          fill
          sizes="(max-width: 600px) 100vw, 33vw"
          className="object-cover transition-transform duration-base group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <h3 className="font-display text-[20px] leading-7 font-semibold text-ink">{category.name}</h3>
        <p className="text-[13px] leading-[18px] text-stone">{category.itemCount} items</p>
      </div>
    </Link>
  );
}
