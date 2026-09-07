import Link from "next/link";

// Breadcrumb — Phase 4 §9. Inline Stone links separated by a Charcoal
// "/"; current page is Ink and not a link.
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-[13px] leading-[18px]">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-2">
              {i > 0 && <span className="text-charcoal" aria-hidden="true">/</span>}
              {isLast || !item.href ? (
                <span className="text-ink" aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="text-stone hover:text-primary-rose">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
