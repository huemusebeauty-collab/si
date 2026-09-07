"use client";
import { Button } from "@/components/basic/Button";

// Error Recovery — Phase 4 §11 Error Screens. Calm (not alarming), plain
// language, clear recovery action.
export function ErrorRecovery({
  heading = "Something went wrong",
  body = "We couldn't load this page. Please try again.",
  onRetry,
}: {
  heading?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-error/30 bg-error/5 p-12 text-center">
      <h3 className="font-display text-[24px] leading-8 font-semibold text-ink">{heading}</h3>
      <p className="max-w-md text-base text-stone">{body}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-2">
          Try Again
        </Button>
      )}
    </div>
  );
}
