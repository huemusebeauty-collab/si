import Link from "next/link";
import { FOOTER_COLUMNS } from "@/constants/navigation";
import { NewsletterForm } from "@/components/sections/NewsletterForm";

// Footer — Phase 4 §9 / Phase 1 §12. Ink background, White/Fog text,
// five link columns, bottom utility row (legal, social, newsletter).
export function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-5">
          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-white/70">{col.heading}</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-[15px] text-white/90 hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-6 border-t border-white/20 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <NewsletterForm />

          <div className="flex gap-4 text-[13px] text-white/70">
            <Link href="/pages/privacy">Privacy</Link>
            <Link href="/pages/terms">Terms</Link>
            <Link href="/pages/accessibility">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
