"use client";
import { Icon } from "@/components/basic/Icon";

// Quantity Selector — Phase 4 §10. Stepper with Outline-style buttons,
// minimum value of 1 enforced visually (and functionally).
export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-primary-plum" role="group" aria-label="Quantity">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-10 w-10 items-center justify-center text-primary-plum disabled:opacity-40"
      >
        <Icon size={20} label="">
          <path d="M5 12h14" />
        </Icon>
      </button>
      <span aria-live="polite" className="w-10 text-center text-base font-semibold text-ink">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-10 w-10 items-center justify-center text-primary-plum disabled:opacity-40"
      >
        <Icon size={20} label="">
          <path d="M12 5v14M5 12h14" />
        </Icon>
      </button>
    </div>
  );
}
