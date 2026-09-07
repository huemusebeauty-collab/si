"use client";
import { useCallback, useEffect, useState } from "react";
import { AdminApiError } from "@/admin/lib/admin-api-client";

// Sprint 6B — shared data-fetching hook used by every admin list/detail
// page, so loading/error/refetch handling is implemented once.
export function useAdminQuery<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetcher()
      .then(setData)
      .catch((err) => setError(err instanceof AdminApiError ? err.message : "Something went wrong."))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
}
