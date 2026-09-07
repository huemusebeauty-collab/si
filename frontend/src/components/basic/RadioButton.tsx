import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";

// RadioButton — Phase 4 §7. Circular; true single-select only.
export interface RadioButtonProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const RadioButton = forwardRef<HTMLInputElement, RadioButtonProps>(
  ({ label, id, className = "", ...props }, ref) => {
    const autoId = useId();
    const radioId = id ?? autoId;
    return (
      <label htmlFor={radioId} className="inline-flex items-center gap-2 cursor-pointer select-none">
        <input
          ref={ref}
          type="radio"
          id={radioId}
          className={`h-5 w-5 border border-fog text-primary-rose accent-[var(--color-primary-rose)] ${className}`}
          {...props}
        />
        <span className="text-base text-ink">{label}</span>
      </label>
    );
  },
);
RadioButton.displayName = "RadioButton";
