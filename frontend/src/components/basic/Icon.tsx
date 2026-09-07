import type { SVGProps } from "react";

// Icon wrapper — Phase 4 §5 Icon System. Consistent 2px outlined stroke,
// rounded joins, 24px default (navigation/shopping) / 20px inline
// (beauty/action) / 16-20px (status). Concrete icon set is a Sprint 2
// asset-integration detail; this wrapper enforces the sizing/stroke
// contract so any icon dropped in stays visually consistent.
export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: 16 | 20 | 24;
  label?: string; // if present, icon is meaningful and gets an accessible name
}

export function Icon({ size = 24, label, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : "presentation"}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      {...props}
    >
      {children}
    </svg>
  );
}
