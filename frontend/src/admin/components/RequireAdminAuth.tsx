"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/admin/lib/admin-auth-context";
import { SkeletonLoader } from "@/components/composite/SkeletonLoader";

// Sprint 6B — redirects to login if no session is present. Client-side
// only (this is a UI convenience, not a security boundary — the
// backend independently rejects any unauthenticated/unauthorized
// request regardless of what this component does).
export function RequireAdminAuth({ children }: { children: React.ReactNode }) {
  const { role, isLoading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !role) router.replace("/admin/login");
  }, [isLoading, role, router]);

  if (isLoading || !role) {
    return (
      <div className="p-8">
        <SkeletonLoader className="h-8 w-64 mb-4" />
        <SkeletonLoader className="h-64 w-full" />
      </div>
    );
  }
  return <>{children}</>;
}
