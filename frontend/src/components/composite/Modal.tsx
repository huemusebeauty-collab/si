"use client";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Icon } from "@/components/basic/Icon";

// Modal — Phase 4 §8/§11 (Confirmation Dialogs). Centered, dimmed overlay,
// used for actions with real consequence. Sprint 2.7 — Accessibility:
// focus trap on open, focus returns to trigger on close, Escape closes,
// role="dialog" + aria-modal.
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    dialogRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink"
        style={{ opacity: "var(--opacity-overlay)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-modal focus:outline-none"
      >
        <div className="flex items-start justify-between">
          <h2 id="modal-title" className="font-display text-[24px] leading-8 font-semibold text-ink">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-charcoal hover:text-primary-rose">
            <Icon size={24} label="">
              <path d="M18 6 6 18M6 6l12 12" />
            </Icon>
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
