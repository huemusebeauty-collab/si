"use client";
// Pagination — Phase 4 §9. Numbered controls, active page in a solid
// Rose circle; "Load More" as Secondary button where infinite scroll
// isn't used.
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Pagination" className="flex justify-center gap-2 py-8">
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
        className="h-9 w-9 rounded-full text-charcoal disabled:opacity-40"
      >
        ‹
      </button>
      {pages.map((page) => {
        const isActive = page === currentPage;
        return (
          <button
            key={page}
            type="button"
            aria-label={`Page ${page}`}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onPageChange(page)}
            className={`h-9 w-9 rounded-full text-base font-semibold ${
              isActive ? "bg-primary-rose text-white" : "text-charcoal hover:bg-paper"
            }`}
          >
            {page}
          </button>
        );
      })}
      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
        className="h-9 w-9 rounded-full text-charcoal disabled:opacity-40"
      >
        ›
      </button>
    </nav>
  );
}
