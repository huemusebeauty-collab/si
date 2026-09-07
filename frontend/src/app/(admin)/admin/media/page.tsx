"use client";
import { useRef, useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { adminApi, AdminApiError } from "@/admin/lib/admin-api-client";
import { Button } from "@/components/basic/Button";
import { Alert } from "@/components/composite/Alert";

function MediaContent() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState<{ key: string; url: string; type: "image" | "video" }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    const files = Array.from(fileInput.current?.files ?? []);
    if (!files.length) return;
    setError(null); setUploading(true);
    try {
      const results = await Promise.all(files.map(async (file) => {
        const result = await adminApi.uploadMedia(file);
        return { ...result, type: file.type.startsWith("video/") ? "video" as const : "image" as const };
      }));
      setUploaded((prev) => [...results, ...prev]);
      if (fileInput.current) fileInput.current.value = "";
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Upload failed.");
    } finally { setUploading(false); }
  }

  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="font-display text-[32px] font-semibold text-ink">Media Library</h1><p className="mt-1 text-sm text-muted">Upload product photos, MP4/WebM videos and campaign media.</p></div>
      {error && <Alert tone="error">{error}</Alert>}
      <RoleGate module="content" level="full" fallback={<Alert tone="information">You do not have permission to upload media.</Alert>}>
        <div className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-6 shadow-rest">
          <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" aria-label="Choose media files" />
          <Button variant="primary" disabled={uploading} onClick={handleUpload}>{uploading ? "Uploading..." : "Upload Media"}</Button>
        </div>
      </RoleGate>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {uploaded.map((item) => <div key={item.key} className="overflow-hidden rounded-lg border border-line bg-white">{item.type === "video" ? <video src={item.url} controls preload="metadata" className="aspect-square w-full object-cover" /> : <img src={item.url} alt="" className="aspect-square w-full object-cover" />}</div>)}
      </div>
    </div>
  );
}

export default function MediaPage() { return <RequireAdminAuth><AdminShell><MediaContent /></AdminShell></RequireAdminAuth>; }
