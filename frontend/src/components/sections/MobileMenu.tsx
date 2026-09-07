"use client";
import Link from "next/link";
import { useState } from "react";
import { Drawer } from "@/components/composite/Drawer";
import { Icon } from "@/components/basic/Icon";
import { ROUTES } from "@/constants/routes";
import type { Category } from "@/types/product";

export function MobileMenu({ isOpen, onClose, categories }: { isOpen: boolean; onClose: () => void; categories: Category[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Menu" side="left">
      <ul className="flex flex-col divide-y divide-fog">
        {categories.map((cat) => {
          const isExpanded = expandedId === cat.id;
          return (
            <li key={cat.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between py-4 text-left text-base font-semibold text-ink"
                aria-expanded={isExpanded}
                onClick={() => setExpandedId(isExpanded ? null : cat.id)}
              >
                {cat.name}
                <Icon size={20} label="">
                  <path d={isExpanded ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
                </Icon>
              </button>
              {isExpanded && (
                <div className="flex flex-col gap-2 pb-4 pl-4">
                  <Link href={ROUTES.category(cat.slug)} onClick={onClose} className="py-1 font-semibold text-charcoal">
                    Shop All {cat.name}
                  </Link>
                  {(cat.subcategories ?? []).map((sub) => (
                    <Link key={sub.id} href={ROUTES.category(sub.slug)} onClick={onClose} className="py-1 text-stone">
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Drawer>
  );
}
