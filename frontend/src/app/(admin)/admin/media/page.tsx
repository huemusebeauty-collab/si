"use client";
import { useRef, useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { adminApi, AdminApiError } from "@/admin/lib/admin-api-client";
import { Button } from "@/components/basic/Button";
import { Alert } from "@/components/composite/Alert";

// Sprint 6B — Media Library. Upload-focused (calls Sprint 3.8/5.6's
// StorageService via POST /v1/storage/upload) — a full asset browser
// (list/search all previously-uploaded objects) would need a new
// backend listing endpoint that doesn't exist yet (S3 object listing
// isn't wired into StorageService) — flagged in Known Issues.
function MediaContent() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState<{ key: string; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const result = await adminApi.uploadMedia(file);
      setUploaded((prev) => [result, ...prev]);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Upload failed.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-semibold text-ink">Media Library</h1>
      {error && <Alert tone="error">{error}</Alert>}
      <RoleGate module="content" level="full" fallback={<Alert tone="information">You do not have permission to upload media.</Alert>}>
        <div className="flex items-center gap-4 rounded-md bg-white p-6 shadow-rest">
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose file to upload" />
          <Button variant="primary" onClick={handleUpload}>Upload</Button>
        </div>
      </RoleGate>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {uploaded.map((item) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={item.key} src={item.url} alt="" className="aspect-square rounded-md object-cover" />
        ))}
      </div>
    </div>
  );
}

export default function MediaPage() {
  return (
    <RequireAdminAuth>
      <AdminShell><MediaContent /></AdminShell>
    </RequireAdminAuth>
  );
}
