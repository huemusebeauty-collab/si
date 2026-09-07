"use client";
import { useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi } from "@/admin/lib/admin-api-client";
import { Button } from "@/components/basic/Button";
import { Input } from "@/components/basic/Input";
import { Toast } from "@/components/composite/Toast";
import { SkeletonLoader } from "@/components/composite/SkeletonLoader";

// Sprint 6B — CMS Editor. Simple static-page content editor: slug-based
// lookup + textarea edit, matching the shape CmsService already exposes
// (getStaticPage/updateStaticPage) — no new content model introduced.
const KNOWN_PAGE_SLUGS = ["about", "shipping-returns", "faqs", "privacy", "terms", "accessibility"];

function CmsPagesContent() {
  const [slug, setSlug] = useState("about");
  const [content, setContent] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const { data: page, isLoading, refetch } = useAdminQuery(() => adminApi.getPage(slug), [slug]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-semibold text-ink">Static Pages</h1>
      <div className="flex gap-4">
        <select value={slug} onChange={(e) => setSlug(e.target.value)} className="h-11 rounded-sm border border-fog px-3">
          {KNOWN_PAGE_SLUGS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {isLoading ? (
        <SkeletonLoader className="h-48 w-full" />
      ) : (
        <div className="flex flex-col gap-4 rounded-md bg-white p-6 shadow-rest">
          <h2 className="font-semibold text-ink">{page?.title}</h2>
          <textarea
            defaultValue={page?.content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="rounded-sm border border-fog p-3 text-base"
            aria-label="Page content"
          />
          <RoleGate module="content" level="full">
            <Button
              variant="primary"
              className="w-fit"
              onClick={async () => {
                await adminApi.updatePage(slug, content || page?.content || "");
                setToast("Page updated.");
                refetch();
              }}
            >
              Save
            </Button>
          </RoleGate>
        </div>
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export default function CmsPagesPage() {
  return (
    <RequireAdminAuth>
      <AdminShell><CmsPagesContent /></AdminShell>
    </RequireAdminAuth>
  );
}
