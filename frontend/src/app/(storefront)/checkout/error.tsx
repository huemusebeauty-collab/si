"use client";

import { useEffect, useRef } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const reloaded = useRef(false);

  useEffect(() => {
    const message = String(error?.message ?? "");
    const isChunkFailure = /ChunkLoadError|Loading chunk|Loading CSS chunk|Failed to load chunk|dynamic import/i.test(message);
    if (isChunkFailure && !reloaded.current) {
      reloaded.current = true;
      const key = "silku-checkout-chunk-reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-ink">Checkout could not be loaded</h1>
      <p className="mt-3 text-stone">Please retry the checkout. Your cart is not charged by this error.</p>
      <button type="button" onClick={reset} className="mt-6 rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white">Try again</button>
    </div>
  );
}
