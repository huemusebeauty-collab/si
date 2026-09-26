"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/services/api/auth";

type Address = {
  id: string;
  line1: string;
  line2?: string | null;
  city: string;
  region: string;
  stateCode?: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

type AddressForm = Omit<Address, "id" | "isDefault"> & { isDefault: boolean };

const emptyForm: AddressForm = {
  line1: "",
  line2: "",
  city: "",
  region: "",
  stateCode: "",
  postalCode: "",
  country: "IN",
  isDefault: false,
};

export default function AddressesClient() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadAddresses() {
    setLoading(true);
    setError("");
    try {
      const response = await authenticatedFetch("/customers/me");
      if (!response.ok) throw new Error("Unable to load your saved addresses.");
      const body = await response.json();
      const customer = body?.data ?? body;
      setAddresses(Array.isArray(customer?.addresses) ? customer.addresses : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your saved addresses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadAddresses(); }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function updateField<K extends keyof AddressForm>(key: K, value: AddressForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const path = editingId ? `/customers/me/addresses/${editingId}` : "/customers/me/addresses";
      const response = await authenticatedFetch(path, {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "Unable to save address.");
      }
      resetForm();
      await loadAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save address.");
    } finally {
      setSaving(false);
    }
  }

  async function removeAddress(id: string) {
    if (!window.confirm("Delete this saved address?")) return;
    setError("");
    const response = await authenticatedFetch(`/customers/me/addresses/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.message || "Unable to delete address.");
      return;
    }
    await loadAddresses();
  }

  async function makeDefault(id: string) {
    setError("");
    const response = await authenticatedFetch(`/customers/me/addresses/${id}/default`, { method: "PATCH" });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.message || "Unable to update default address.");
      return;
    }
    await loadAddresses();
  }

  if (loading) {
    return <div className="mt-8 max-w-2xl rounded-md border border-fog bg-white p-8 text-stone">Loading your saved addresses…</div>;
  }

  return (
    <div className="mt-8 max-w-3xl space-y-6">
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {addresses.length === 0 ? (
        <div className="rounded-md border border-fog bg-white p-8 text-stone">
          No saved addresses yet. Add your first delivery address below.
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <div key={address.id} className="rounded-md border border-fog bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="text-sm leading-6 text-ink">
                  <div>{address.line1}</div>
                  {address.line2 && <div>{address.line2}</div>}
                  <div>{address.city}, {address.region}{address.stateCode ? ` (${address.stateCode})` : ""} — {address.postalCode}</div>
                  <div>{address.country}</div>
                  {address.isDefault && <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-stone">Default address</div>}
                </div>
                <div className="flex gap-3 text-sm">
                  <button type="button" className="underline" onClick={() => {
                    setEditingId(address.id);
                    setForm({
                      line1: address.line1,
                      line2: address.line2 ?? "",
                      city: address.city,
                      region: address.region,
                      stateCode: address.stateCode ?? "",
                      postalCode: address.postalCode,
                      country: address.country,
                      isDefault: address.isDefault,
                    });
                  }}>Edit</button>
                  <button type="button" className="underline" onClick={() => void removeAddress(address.id)}>Delete</button>
                  {!address.isDefault && <button type="button" className="underline" onClick={() => void makeDefault(address.id)}>Make default</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={saveAddress} className="rounded-md border border-fog bg-white p-6 space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">{editingId ? "Edit address" : "Add address"}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2 text-sm text-ink">Address Line 1<input required value={form.line1} onChange={(e) => updateField("line1", e.target.value)} className="mt-1 w-full rounded border border-fog px-3 py-2" /></label>
          <label className="md:col-span-2 text-sm text-ink">Address Line 2<input value={form.line2 ?? ""} onChange={(e) => updateField("line2", e.target.value)} className="mt-1 w-full rounded border border-fog px-3 py-2" /></label>
          <label className="text-sm text-ink">City<input required value={form.city} onChange={(e) => updateField("city", e.target.value)} className="mt-1 w-full rounded border border-fog px-3 py-2" /></label>
          <label className="text-sm text-ink">State<input required value={form.region} onChange={(e) => updateField("region", e.target.value)} className="mt-1 w-full rounded border border-fog px-3 py-2" /></label>
          <label className="text-sm text-ink">State Code<input maxLength={2} value={form.stateCode ?? ""} onChange={(e) => updateField("stateCode", e.target.value.toUpperCase())} className="mt-1 w-full rounded border border-fog px-3 py-2" /></label>
          <label className="text-sm text-ink">PIN Code<input required value={form.postalCode} onChange={(e) => updateField("postalCode", e.target.value)} className="mt-1 w-full rounded border border-fog px-3 py-2" /></label>
          <label className="text-sm text-ink">Country<input required maxLength={2} value={form.country} onChange={(e) => updateField("country", e.target.value.toUpperCase())} className="mt-1 w-full rounded border border-fog px-3 py-2" /></label>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={form.isDefault} onChange={(e) => updateField("isDefault", e.target.checked)} /> Make this my default address</label>
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="rounded bg-ink px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : editingId ? "Update address" : "Save address"}</button>
          {editingId && <button type="button" onClick={resetForm} className="rounded border border-fog px-5 py-2 text-sm">Cancel</button>}
        </div>
      </form>
    </div>
  );
}
