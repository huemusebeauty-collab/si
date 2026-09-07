import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// Button — Phase 4 §6 Button System. Every variant shares corner radius,
// height, and label typography; only fill/border/text color vary.
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "text"
  | "icon"
  | "success"
  | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary-rose text-white hover:opacity-90",
  secondary: "bg-primary-plum text-white hover:opacity-90",
  outline: "bg-transparent border border-primary-plum text-primary-plum hover:bg-secondary-blush",
  text: "bg-transparent text-primary-rose hover:underline px-1",
  icon: "bg-transparent text-charcoal hover:text-primary-rose rounded-full p-2",
  success: "bg-success text-white hover:opacity-90",
  danger: "bg-error text-white hover:opacity-90",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", isLoading, fullWidth, disabled, className = "", children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-md h-11 px-6 font-interface text-[15px] leading-5 font-semibold transition-opacity duration-fast disabled:opacity-40 disabled:pointer-events-none";
    const width = fullWidth ? "w-full" : "";

    return (
      <button
        ref={ref}
        className={`${base} ${VARIANT_CLASSES[variant]} ${width} ${className}`}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : null}
        <span>{children}</span>
      </button>
    );
  },
);
Button.displayName = "Button";
