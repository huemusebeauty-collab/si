"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/basic/Icon";
import { ROUTES } from "@/constants/routes";

// Search Bar with Autocomplete — Phase 4 §17 composite component.
// Sprint 2 scope: UI + keyboard-accessible suggestion list wired to mock
// data; real search indexing is a Sprint 3+/search-service concern.
export function SearchBar({ suggestions = [] as string[] }: { suggestions?: string[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const listId = useId();

  const filtered = query.length > 0
    ? suggestions.filter((s) => s.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  function submit(term: string) {
    setOpen(false);
    router.push(`${ROUTES.search}?q=${encodeURIComponent(term)}`);
  }

  return (
    <div className="relative w-full max-w-md">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
      >
        <label htmlFor="site-search" className="sr-only">
          Search products
        </label>
        <div className="flex items-center gap-2 rounded-md border border-fog px-3 focus-within:border-primary-rose">
          <Icon size={20} label="">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </Icon>
          <input
            id="site-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            placeholder="Search shades, products, guides..."
            role="combobox"
            aria-expanded={open && filtered.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            className="h-11 w-full bg-transparent text-base text-ink placeholder:text-mist focus:outline-none"
          />
        </div>
      </form>
      {open && filtered.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 w-full rounded-md border border-fog bg-white shadow-hover"
        >
          {filtered.map((s) => (
            <li key={s} role="option" aria-selected="false">
              <button
                type="button"
                onClick={() => submit(s)}
                className="block w-full px-4 py-2 text-left text-base text-ink hover:bg-paper"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
