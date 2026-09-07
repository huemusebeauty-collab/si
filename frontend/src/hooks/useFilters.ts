"use client";
import { useState } from "react";

// Sprint 2 scope: local filter-selection state only, against mock facets.
// Wired to real query-param-driven filtering + API calls in a later sprint.
export function useFilters() {
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  return { selected, toggle };
}
