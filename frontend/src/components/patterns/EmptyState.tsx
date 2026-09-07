"use client";
import type { ReactNode } from "react";
import { Button } from "@/components/basic/Button";

// Empty State — Phase 4 §17 Reusable Patterns / §8 Information Card.
// Icon, short heading, short body text; used for empty cart, wishlist,
// search results, order history.
export function EmptyState({
  icon,
  heading,
  body,
  actionLabel,
  onAction,
}: {
  icon?: ReactNode;
  heading: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md bg-white p-12 text-center">
      {icon && <div aria-hidden="true">{icon}</div>}
      <h3 className="font-display text-[24px] leading-8 font-semibold text-ink">{heading}</h3>
      <p className="max-w-md text-base text-stone">{body}</p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
