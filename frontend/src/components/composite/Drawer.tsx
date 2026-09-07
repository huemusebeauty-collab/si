"use client";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Icon } from "@/components/basic/Icon";

// Drawer — generic sliding overlay panel underlying Mobile Menu (Phase 4
// §9) and Cart Panel (Phase 4 §17 Page Sections). Full-screen Paper-
// background overlay sliding in from the edge, per Phase 4 §9.
export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  side?: "left" | "right";
  children: ReactNode;
}

export function Drawer({ isOpen, onClose, title, side = "right", children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-ink"
        style={{ opacity: "var(--opacity-overlay)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
        className={`absolute top-0 h-full w-full max-w-sm bg-paper shadow-modal focus:outline-none ${
          side === "right" ? "right-0" : "left-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-fog p-4">
          <h2 id="drawer-title" className="font-display text-[20px] leading-7 font-semibold text-ink">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-charcoal hover:text-primary-rose">
            <Icon size={24} label="">
              <path d="M18 6 6 18M6 6l12 12" />
            </Icon>
          </button>
        </div>
        <div className="h-[calc(100%-65px)] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
