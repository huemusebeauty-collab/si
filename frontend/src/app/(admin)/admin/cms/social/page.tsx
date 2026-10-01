"use client";

import { useEffect, useState } from "react";
import { AdminApiError, adminApi, type AdminSocialProfile } from "@/admin/lib/admin-api-client";
import { RoleGate } from "@/admin/components/RoleGate";
import { Button } from "@/components/basic/Button";

const SOCIAL_PLATFORMS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "threads", label: "Threads" },
  { value: "youtube", label: "YouTube" },
  { value: "x", label: "X / Twitter" },
  { value: "pinterest", label: "Pinterest" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "snapchat", label: "Snapchat" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
] as const;

export default function SocialMediaPage() {
  const [items, setItems] = useState<AdminSocialProfile[]>([]);
  const [platform, setPlatform] = useState("instagram");
  const [profileUrl, setProfileUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      setItems(await adminApi.listSocialProfiles());
    } catch (error) {
      setMessage(error instanceof AdminApiError ? error.message : "Unable to load social profiles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function edit(item: AdminSocialProfile) {
    setEditing(item.id);
    setPlatform(item.platform);
    setProfileUrl(item.profileUrl);
    setEnabled(item.enabled);
    setMessage("");
  }

  function resetForm() {
    setEditing(null);
    setPlatform("instagram");
    setProfileUrl("");
    setEnabled(true);
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      if (editing) {
        await adminApi.updateSocialProfile(editing, { platform, profileUrl, enabled });
      } else {
        await adminApi.createSocialProfile({ platform, profileUrl, enabled });
      }
      resetForm();
      await load();
      setMessage("Social profile published successfully.");
    } catch (error) {
      setMessage(error instanceof AdminApiError ? error.message : "Unable to save social profile.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this social profile from Silku footer?")) return;
    try {
      await adminApi.deleteSocialProfile(id);
      await load();
    } catch (error) {
      setMessage(error instanceof AdminApiError ? error.message : "Unable to remove social profile.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="font-display text-[30px] font-semibold text-ink">Social Media</h1>
        <p className="mt-1 text-[15px] text-stone">Add official social profile links. Enabled profiles appear automatically in the website footer.</p>
      </div>

      <RoleGate module="content" level="full">
        <section className="rounded-md border border-fog bg-white p-5">
          <h2 className="text-[18px] font-semibold text-ink">{editing ? "Edit Social Profile" : "Add Social Profile"}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-[14px] font-medium text-charcoal">
              Platform
              <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="mt-1 w-full rounded border border-fog bg-white px-3 py-2">
                {SOCIAL_PLATFORMS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-[14px] font-medium text-charcoal">
              Profile URL
              <input value={profileUrl} onChange={(event) => setProfileUrl(event.target.value)} placeholder="https://instagram.com/yourprofile" className="mt-1 w-full rounded border border-fog px-3 py-2" />
            </label>
          </div>
          <label className="mt-4 flex items-center gap-2 text-[14px] text-charcoal">
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
            Publish in website footer
          </label>
          <div className="mt-5 flex gap-3">
            <Button variant="primary" onClick={save} disabled={saving || !profileUrl.trim()}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Publish Social Profile"}
            </Button>
            {editing && <Button variant="secondary" onClick={resetForm}>Cancel</Button>}
          </div>
          {message && <p className="mt-3 text-[14px] text-stone" role="status">{message}</p>}
        </section>

        <section className="mt-6 rounded-md border border-fog bg-white p-5">
          <h2 className="text-[18px] font-semibold text-ink">Published Profiles</h2>
          {loading ? (
            <p className="mt-4 text-stone">Loading...</p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-stone">No social profiles configured yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-fog">
              {items.map((item) => {
                const label = SOCIAL_PLATFORMS.find((entry) => entry.value === item.platform)?.label ?? item.platform;
                return (
                  <div key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-ink">{label}</p>
                      <p className="break-all text-[14px] text-stone">{item.profileUrl}</p>
                      <p className="mt-1 text-[12px] uppercase tracking-wide text-stone">{item.enabled ? "Published" : "Hidden"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => edit(item)}>Edit</Button>
                      <Button variant="text" onClick={() => void remove(item.id)}>Remove</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </RoleGate>
    </div>
  );
}
