"use client";
import { useEffect } from "react";

// Toast — Phase 4 §11. Compact, bottom-anchored (mobile) / bottom-right
// (desktop), auto-dismissing, non-blocking confirmations only.
export interface ToastProps {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}

export function Toast({ message, onDismiss, durationMs = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [onDismiss, durationMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-ink px-4 py-3 text-white shadow-hover sm:left-auto sm:right-4 sm:translate-x-0"
    >
      {message}
    </div>
  );
}
