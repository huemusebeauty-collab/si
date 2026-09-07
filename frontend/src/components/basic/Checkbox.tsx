import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";

// Checkbox — Phase 4 §7. Square, rounded corners; label always tappable.
export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, className = "", ...props }, ref) => {
    const autoId = useId();
    const checkboxId = id ?? autoId;
    return (
      <label htmlFor={checkboxId} className="inline-flex items-center gap-2 cursor-pointer select-none">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className={`h-5 w-5 rounded-sm border border-fog text-primary-rose accent-[var(--color-primary-rose)] ${className}`}
          {...props}
        />
        <span className="text-base text-ink">{label}</span>
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";
