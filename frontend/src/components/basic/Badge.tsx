import type { ReactNode } from "react";

// Badge — Phase 4 §10. Small pill-shaped label using semantic/accent colors.
export type BadgeTone = "new" | "best-seller" | "limited-edition" | "luxury" | "success" | "warning" | "error" | "information";

const TONE_CLASSES: Record<BadgeTone, string> = {
  new: "bg-information text-white",
  "best-seller": "bg-secondary-gold text-white",
  "limited-edition": "bg-accent-elite text-white",
  luxury: "bg-primary-plum text-white",
  success: "bg-success text-white",
  warning: "bg-warning text-white",
  error: "bg-error text-white",
  information: "bg-information text-white",
};

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] leading-4 font-semibold uppercase tracking-wide ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
