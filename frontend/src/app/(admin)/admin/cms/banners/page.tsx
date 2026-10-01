"use client";
import { useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi } from "@/admin/lib/admin-api-client";
import { Button } from "@/components/basic/Button";
import { Input } from "@/components/basic/Input";
import type { AdminBanner } from "@/admin/lib/admin-api-client";

const PLACEMENT = "homepage-hero";

function toLocalInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function BannersContent() {
  const { data, isLoading, refetch } = useAdminQuery(() => adminApi.listBanners(PLACEMENT), []);
  const [headline, setHeadline] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAltText, setImageAltText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("/shop");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState<Array<{ key: string; url: string; type: "image" | "video"; contentType: string; size: number }>>([]);

  function resetForm() {
    setEditing(null);
    setHeadline("");
    setImageUrl("");
    setImageAltText("");
    setCtaUrl("/shop");
    setStartAt("");
    setEndAt("");
  }

  async function openMediaPicker() {
    setMediaOpen(true);
    if (mediaItems.length) return;
    setMediaLoading(true);
    try {
      const { items } = await adminApi.listMedia("cms-assets");
      setMediaItems(items.map(({ key, url, type, contentType, size }) => ({ key, url, type, contentType, size })));
    } finally {
      setMediaLoading(false);
    }
  }

  function editBanner(banner: AdminBanner) {
    setEditing(banner.id);
    setHeadline(banner.headline ?? "");
    setImageUrl(banner.imageUrl);
    setImageAltText(banner.imageAltText ?? "");
    setCtaUrl(banner.ctaUrl ?? "/shop");
    setStartAt(toLocalInput(banner.startAt));
    setEndAt(toLocalInput(banner.endAt));
  }

  async function saveBanner() {
    if (!imageUrl.trim() || !startAt || !endAt) return;
    setSaving(true);
    try {
      const payload = {
        placement: PLACEMENT,
        headline,
        imageUrl,
        imageAltText,
        ctaUrl,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
      };
      if (editing) await adminApi.updateBanner(editing, payload);
      else await adminApi.createBanner(payload);
      resetForm();
      refetch();
    } finally {
      setSaving(false);
    }
  }

  async function removeBanner(id: string) {
    if (!window.confirm("Remove this Hero banner?")) return;
    await adminApi.deleteBanner(id);
    if (editing === id) resetForm();
    refetch();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[32px] font-semibold text-ink">Hero Banners</h1>
        <p className="mt-1 text-sm text-stone">Homepage Hero slider — add, edit, schedule, reorder by start date, or remove banners.</p>
      </div>

      <div className="grid gap-4">
        {isLoading ? <p className="text-sm text-stone">Loading banners…</p> : null}
        {!isLoading && !(data?.length) ? <p className="rounded-md bg-white p-5 text-sm text-stone shadow-rest">No active Hero banners.</p> : null}
        {data?.map((banner) => (
          <div key={banner.id} className="flex flex-col gap-4 rounded-md bg-white p-5 shadow-rest md:flex-row md:items-center">
            <img src={banner.imageUrl} alt={banner.imageAltText ?? banner.headline ?? "Hero banner"} className="h-28 w-full rounded-md object-contain bg-paper md:w-56" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{banner.headline || "Untitled Hero"}</p>
              <p className="break-all text-xs text-stone">{banner.imageUrl}</p>
              <p className="mt-1 text-xs text-stone">{new Date(banner.startAt).toLocaleString()} → {new Date(banner.endAt).toLocaleString()}</p>
            </div>
            <RoleGate module="content" level="full">
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => editBanner(banner)}>Edit</Button>
                <Button variant="secondary" onClick={() => removeBanner(banner.id)}>Remove</Button>
              </div>
            </RoleGate>
          </div>
        ))}
      </div>

      <RoleGate module="content" level="full">
        <div className="flex flex-col gap-4 rounded-md bg-white p-6 shadow-rest">
          <h2 className="font-semibold text-ink">{editing ? "Edit Hero Banner" : "New Hero Banner"}</h2>
          <Input label="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} />
          <div className="flex flex-col gap-2">
            <Input label="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            <Button variant="secondary" className="w-fit" type="button" onClick={() => void openMediaPicker()}>Choose from Media Library</Button>
            <p className="text-xs text-stone">Use CMS Assets for production Hero images. Uploaded assets are stored and optimized by Silku.</p>
          </div>
          <Input label="Alt Text" value={imageAltText} onChange={(e) => setImageAltText(e.target.value)} />
          <Input label="CTA URL" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Start" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            <Input label="End" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" className="w-fit" disabled={saving} onClick={saveBanner}>{saving ? "Saving…" : editing ? "Save Changes" : "Create Banner"}</Button>
            {editing ? <Button variant="secondary" onClick={resetForm}>Cancel</Button> : null}
          </div>
        </div>
      </RoleGate>
    </div>
      {mediaOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Choose Hero media">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-6 shadow-rest">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div><h2 className="font-semibold text-ink">Choose CMS Asset</h2><p className="text-xs text-stone">Select an image from Admin → Media Library → CMS Assets.</p></div>
              <Button variant="secondary" onClick={() => setMediaOpen(false)}>Close</Button>
            </div>
            {mediaLoading ? <p className="py-8 text-center text-sm text-stone">Loading CMS assets…</p> : null}
            {!mediaLoading && !mediaItems.length ? <p className="rounded-md bg-paper p-5 text-sm text-stone">No CMS assets found. Upload the Hero image in Media Library with Library = CMS Assets, then choose it here.</p> : null}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {mediaItems.filter((item) => item.type === "image").map((item) => (
                <button key={item.key} type="button" className="overflow-hidden rounded-lg border border-line bg-white text-left hover:ring-2 hover:ring-ink" onClick={() => { setImageUrl(item.url); setMediaOpen(false); }}>
                  <img src={item.url} alt="" className="aspect-video w-full object-contain bg-paper" loading="lazy" />
                  <span className="block truncate px-3 py-2 text-xs text-stone">{item.key}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
  );
}

export default function BannersPage() {
  return (
    <RequireAdminAuth>
      <AdminShell><BannersContent /></AdminShell>
    </RequireAdminAuth>
  );
}
