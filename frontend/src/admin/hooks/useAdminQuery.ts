"use client";
import { useCallback, useEffect, useState } from "react";
import { AdminApiError } from "@/admin/lib/admin-api-client";

// Shared admin query state. Fetchers are normalized through Promise.resolve()
// so synchronous failures cannot leave an admin page stuck/blank.
export function useAdminQuery<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setError(null);

    Promise.resolve()
      .then(() => fetcher())
      .then((result) => setData(result))
      .catch((err) => {
        if (err instanceof AdminApiError) {
          setError(err.message);
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to load admin data.");
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    Promise.resolve()
      .then(() => fetcher())
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof AdminApiError) {
          setError(err.message);
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to load admin data.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch]);

  return { data, isLoading, error, refetch };
}
