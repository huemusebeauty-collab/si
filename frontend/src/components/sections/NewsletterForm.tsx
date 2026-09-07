"use client";
import { Input } from "@/components/basic/Input";
import { Button } from "@/components/basic/Button";

// Extracted from Footer so the (mostly static) Footer stays a Server
// Component — only this small interactive slice ships as client JS
// (Sprint 2.8 — Performance: minimize client bundle size).
export function NewsletterForm() {
  return (
    <form className="flex max-w-sm gap-2" onSubmit={(e) => e.preventDefault()} aria-label="Newsletter signup">
      <div className="flex-1">
        <Input label="Email" type="email" placeholder="you@example.com" className="text-ink" />
      </div>
      <Button variant="secondary" type="submit" className="self-end">
        Subscribe
      </Button>
    </form>
  );
}
