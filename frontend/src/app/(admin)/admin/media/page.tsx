"use client";
import { useEffect, useRef, useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { adminApi, AdminApiError } from "@/admin/lib/admin-api-client";
import { Button } from "@/components/basic/Button";
import { Alert } from "@/components/composite/Alert";

function MediaContent() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState<{ key: string; url: string; type: "image" | "video"; contentType: string; size: number; originalSize: number | null; savedBytes: number | null; savedPercent: number | null }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState(0);
  const [reoptimizing, setReoptimizing] = useState(false);
  const [optimizationReport, setOptimizationReport] = useState<{ scanned: number; optimized: number; unchanged: number; failed: number; savedBytes: number } | null>(null);
  const formatBytes = (bytes: number) => bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

  useEffect(() => {
    void adminApi.listMedia()
      .then(({ items }) => setUploaded(items.map(({ key, url, type, contentType, size, originalSize, savedBytes, savedPercent }) => ({ key, url, type, contentType, size, originalSize, savedBytes, savedPercent }))))
      .catch((err) => setError(err instanceof AdminApiError ? err.message : "Unable to load media library."))
      .finally(() => setLoading(false));
  }, []);

  async function handleReoptimize() {\n    setError(null); setOptimizationReport(null); setReoptimizing(true);\n    try {\n      const report = await adminApi.reoptimizeMedia();\n      setOptimizationReport(report);\n      const { items } = await adminApi.listMedia();\n      setUploaded(items.map(({ key, url, type, contentType, size, originalSize, savedBytes, savedPercent }) => ({ key, url, type, contentType, size, originalSize, savedBytes, savedPercent })));\n    } catch (err) {\n      setError(err instanceof AdminApiError ? err.message : "Media optimization failed.");\n    } finally { setReoptimizing(false); }\n  }\n\n  async function handleUpload() {
    const files = Array.from(fileInput.current?.files ?? []);
    if (!files.length) return;
    setError(null); setUploading(true);
    try {
      const results = await Promise.all(files.map(async (file) => {
        const result = await adminApi.uploadMedia(file);
        return { key: result.key, url: result.url, contentType: result.contentType, size: result.storedSize, originalSize: result.originalSize, savedBytes: result.savedBytes, savedPercent: result.savedPercent, type: file.type.startsWith("video/") ? "video" as const : "image" as const };
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
          <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4" aria-label="Choose media files" onChange={(event) => setSelectedFiles(event.target.files?.length ?? 0)} />
          <Button variant="primary" disabled={uploading || reoptimizing} onClick={handleUpload}>{uploading ? "Optimizing & Uploading..." : "Upload Media"}</Button>\n          <Button variant="secondary" disabled={uploading || reoptimizing} onClick={handleReoptimize}>{reoptimizing ? "Optimizing Library..." : "Safe Optimize Library"}</Button>
          <span className="text-xs text-muted">Images auto-optimize to WebP (max 2400px). MP4 max upload: 25MB.</span>
          {selectedFiles > 0 && <span className="text-xs text-muted">{selectedFiles} file{selectedFiles === 1 ? "" : "s"} selected</span>}\n          {optimizationReport && <span className="text-xs text-muted">Scanned {optimizationReport.scanned} · Optimized {optimizationReport.optimized} · Unchanged {optimizationReport.unchanged} · Failed {optimizationReport.failed} · Saved {formatBytes(optimizationReport.savedBytes)}</span>}
        </div>
      </RoleGate>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {loading ? <div className="col-span-full py-10 text-center text-sm text-muted">Loading media library...</div> : uploaded.map((item) => <div key={item.key} className="overflow-hidden rounded-lg border border-line bg-white"><div>{item.type === "video" ? <video src={item.url} controls preload="metadata" className="aspect-square w-full object-cover"><track kind="captions" srcLang="en" label="English captions" /></video> : <img src={item.url} alt="" loading="lazy" decoding="async" className="aspect-square w-full object-cover" />}</div><div className="space-y-1 border-t border-line px-3 py-2 text-xs text-muted"><div className="flex justify-between gap-3"><span>Stored</span><span className="font-medium text-ink">{formatBytes(item.size)}</span></div>{item.originalSize !== null ? <><div className="flex justify-between gap-3"><span>Original</span><span>{formatBytes(item.originalSize)}</span></div><div className="flex justify-between gap-3"><span>Saved</span><span>{item.savedBytes !== null ? formatBytes(item.savedBytes) : "0 B"}{item.savedPercent !== null ? ` (${item.savedPercent.toFixed(1)}%)` : ""}</span></div></> : <div className="flex justify-between gap-3"><span>Original</span><span>Legacy media</span></div>}<div className="truncate pt-0.5">{item.contentType}</div></div></div>)}
      </div>
    </div>
  );
}

export default function MediaPage() { return <RequireAdminAuth><AdminShell><MediaContent /></AdminShell></RequireAdminAuth>; }
