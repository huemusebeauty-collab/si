import Link from "next/link";
import { Label } from "@/components/basic/Label";
import { ROUTES } from "@/constants/routes";
import type { Category } from "@/types/product";

export function MegaMenu({ category }: { category: Category }) {
  const subs = category.subcategories ?? [];
  if (subs.length === 0) return null;

  const columnCount = subs.length > 12 ? 3 : subs.length > 6 ? 2 : 1;
  const columns: typeof subs[] = Array.from({ length: columnCount }, () => []);
  subs.forEach((sub, i) => columns[i % columnCount].push(sub));

  return (
    <div className="absolute inset-x-0 border-b border-fog bg-white shadow-hover" role="region" aria-label={`${category.name} menu`}>
      <div className="mx-auto grid max-w-content gap-8 px-6 py-8" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
        {columns.map((col, i) => (
          <div key={i}>
            {i === 0 && <Label>Shop {category.name}</Label>}
            <ul className={i === 0 ? "mt-3 flex flex-col gap-2" : "flex flex-col gap-2"}>
              {col.map((sub) => (
                <li key={sub.id}>
                  <Link href={ROUTES.category(sub.slug)} className="text-base text-charcoal hover:text-primary-rose">
                    {sub.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
