"use client";
import { useEffect, useState } from "react";

// Sprint 2.6 — Responsive Design helper hook, used where a component
// needs to branch behavior (not just layout) by breakpoint — CSS/Tailwind
// remains the default approach; this is the exception for JS-driven cases.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
