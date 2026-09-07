import type { ReactNode } from "react";

// Label — Phase 4 §3 Label type style. Uppercase, tracked, semibold.
export function Label({ children, as: Tag = "span" }: { children: ReactNode; as?: "span" | "label" }) {
  return (
    <Tag className="text-[12px] leading-4 font-semibold uppercase tracking-wide text-charcoal">
      {children}
    </Tag>
  );
}
