"use client";
import { useState } from "react";
import type { Shade } from "@/types/product";

// Shade Selector — keeps the first available shade selected and exposes the
// selected ID so product detail can send the exact variant to the cart API.
export function ShadeSelector({
  shades,
  selectedId,
  onChange,
}: {
  shades: Shade[];
  selectedId?: string;
  onChange?: (shadeId: string) => void;
}) {
  const firstAvailable = shades.find((shade) => shade.inStock)?.id ?? shades[0]?.id;
  const [internalSelectedId, setInternalSelectedId] = useState(selectedId ?? firstAvailable);
  const activeId = selectedId ?? internalSelectedId;

  return (
    <fieldset>
      <legend className="text-[12px] leading-4 font-semibold uppercase tracking-wide text-charcoal mb-2">
        Shade: {shades.find((s) => s.id === activeId)?.name}
      </legend>
      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Select a shade">
        {shades.map((shade) => {
          const isSelected = shade.id === activeId;
          return (
            <button
              key={shade.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${shade.name}${shade.inStock ? "" : " (out of stock)"}`}
              disabled={!shade.inStock}
              onClick={() => {
                setInternalSelectedId(shade.id);
                onChange?.(shade.id);
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
