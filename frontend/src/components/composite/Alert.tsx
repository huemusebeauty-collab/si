import type { ReactNode } from "react";

// Alert — Phase 4 §11. Inline banner, semantic color + icon, page-level
// notices that shouldn't be missed.
export type AlertTone = "success" | "warning" | "error" | "information";

const TONE_CLASSES: Record<AlertTone, string> = {
  success: "bg-success/10 border-success text-success",
  warning: "bg-warning/10 border-warning text-warning",
  error: "bg-error/10 border-error text-error",
  information: "bg-information/10 border-information text-information",
};

export function Alert({ tone, children }: { tone: AlertTone; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-md border px-4 py-3 ${TONE_CLASSES[tone]}`}
    >
      <span aria-hidden="true" className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-current" />
      <p className="text-base">{children}</p>
    </div>
  );
}
