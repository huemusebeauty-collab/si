"use client";
import { useState } from "react";
import type { Shade } from "@/types/product";

// Shade Selector — Phase 4 §10. Circular swatches, Rose ring for selected,
// disabled (out-of-stock) swatches shown at reduced opacity, never hidden.
export function ShadeSelector({
  shades,
  onSelect,
}: {
  shades: Shade[];
  onSelect?: (shade: Shade) => void;
}) {
  const [selectedId, setSelectedId] = useState(shades[0]?.id);

  return (
    <fieldset>
      <legend className="text-[12px] leading-4 font-semibold uppercase tracking-wide text-charcoal mb-2">
        Shade: {shades.find((s) => s.id === selectedId)?.name}
      </legend>
      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Select a shade">
        {shades.map((shade) => {
          const isSelected = shade.id === selectedId;
          return (
            <button
              key={shade.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${shade.name}${shade.inStock ? "" : " (out of stock)"}`}
              disabled={!shade.inStock}
              onClick={() => {
                setSelectedId(shade.id);
                onSelect?.(shade);
              }}
              className={`h-9 w-9 rounded-full border-2 transition-transform duration-fast disabled:opacity-40 ${
                isSelected ? "border-primary-rose scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: shade.hex }}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
