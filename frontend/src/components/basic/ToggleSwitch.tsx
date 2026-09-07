"use client";
import { useId } from "react";

// ToggleSwitch — Phase 4 §7. Pill track, Mist off / Rose on. Binary
// preference settings only (not for navigation or destructive actions).
export interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ToggleSwitch({ label, checked, onChange, disabled }: ToggleSwitchProps) {
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      <span id={`${id}-label`} className="text-base text-ink">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors duration-fast disabled:opacity-40 ${
          checked ? "bg-primary-rose" : "bg-mist"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-fast ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
