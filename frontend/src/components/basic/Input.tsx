import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";

// Input — Phase 4 §7 Form System. Label always above the field (never
// placeholder-only), Fog border default, Rose on focus, Error-red +
// helper text on invalid input, always paired with text (never color alone).
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  errorText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, errorText, id, className = "", ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const helperId = `${inputId}-helper`;
    const hasError = Boolean(errorText);

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={inputId}
          className="text-[12px] leading-4 font-semibold uppercase tracking-wide text-charcoal"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-describedby={(helperText || errorText) ? helperId : undefined}
          aria-invalid={hasError || undefined}
          className={`h-11 rounded-sm border px-3 text-base text-ink placeholder:text-mist focus-visible:outline-none ${
            hasError
              ? "border-error focus:border-error"
              : "border-fog focus:border-primary-rose"
          } ${className}`}
          {...props}
        />
        {(helperText || errorText) && (
          <p
            id={helperId}
            className={`text-[13px] leading-[18px] ${hasError ? "text-error" : "text-stone"}`}
          >
            {errorText || helperText}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
