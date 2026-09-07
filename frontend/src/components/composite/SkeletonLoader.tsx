// Skeleton Loader — Phase 4 §11. Paper-colored placeholder blocks matching
// the shape of the content being loaded.
export function SkeletonLoader({ className = "" }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-pulse rounded-md bg-fog/50 ${className}`}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-md bg-white p-4 shadow-rest">
      <SkeletonLoader className="aspect-square w-full" />
      <SkeletonLoader className="h-4 w-3/4" />
      <SkeletonLoader className="h-4 w-1/3" />
    </div>
  );
}
