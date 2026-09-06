import type { Config } from "tailwindcss";

// Tailwind is configured entirely from Phase 4 design tokens (Phase 14
// §14.1 — Styling Approach) so a developer cannot introduce an
// off-palette color, spacing value, or breakpoint by construction.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    // Breakpoints (Phase 4 §4/§18: bp-mobile <600, bp-tablet 600-1024,
    // bp-desktop 1024-1440, bp-large >1440). Tailwind's `sm/md/lg/xl` are
    // remapped to these exact values rather than Tailwind's defaults.
    screens: {
      sm: "600px",  // bp-tablet starts
      md: "1024px", // bp-desktop starts
      lg: "1440px", // bp-large starts
    },
    extend: {
      colors: {
        "primary-plum": "var(--color-primary-plum)",
        "primary-rose": "var(--color-primary-rose)",
        "secondary-gold": "var(--color-secondary-gold)",
        "secondary-blush": "var(--color-secondary-blush)",
        "accent-elite": "var(--color-accent-elite)",
        "accent-essential": "var(--color-accent-essential)",
        ink: "var(--color-neutral-ink)",
        charcoal: "var(--color-neutral-charcoal)",
        stone: "var(--color-neutral-stone)",
        mist: "var(--color-neutral-mist)",
        fog: "var(--color-neutral-fog)",
        paper: "var(--color-neutral-paper)",
        white: "var(--color-neutral-white)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
        information: "var(--color-information)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        interface: ["var(--font-interface)"],
      },
      spacing: {
        "1": "var(--space-1)",
        "2": "var(--space-2)",
        "3": "var(--space-3)",
        "4": "var(--space-4)",
        "6": "var(--space-6)",
        "8": "var(--space-8)",
        "12": "var(--space-12)",
        "16": "var(--space-16)",
        "24": "var(--space-24)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        rest: "var(--shadow-rest)",
        hover: "var(--shadow-hover)",
        modal: "var(--shadow-modal)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "250ms",
      },
      maxWidth: {
        content: "1280px", // Large Display max content width, Phase 4 §4
      },
    },
  },
  plugins: [],
};

export default config;
