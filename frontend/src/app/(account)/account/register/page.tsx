"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ROUTES } from "@/constants/routes";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

type RegisterResponse = {
  data?: { customerId?: string; sessionToken?: string; refreshToken?: string };
  customerId?: string;
  sessionToken?: string;
  refreshToken?: string;
  message?: string;
};

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = (await response.json()) as RegisterResponse;
      const result = body.data ?? body;

      if (!response.ok || !result.sessionToken) {
        throw new Error(body.message || "Unable to create your account.");
      }

      sessionStorage.setItem("silku_session_token", result.sessionToken);
      if (result.refreshToken) sessionStorage.setItem("silku_refresh_token", result.refreshToken);
      window.location.assign(ROUTES.account);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-12 sm:py-16">
      <div className="rounded-2xl border border-fog bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-rose">Join Silku</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Create your account</h1>
        <p className="mt-2 text-sm text-ink/70">Save your wishlist and keep your orders in one place.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-ink">
              First name
              <input required value={form.firstName} onChange={(e) => update("firstName", e.target.value)} className="mt-2 w-full rounded-lg border border-fog px-3 py-3 outline-none focus:border-primary-rose" />
            </label>
            <label className="block text-sm font-medium text-ink">
              Last name
              <input required value={form.lastName} onChange={(e) => update("lastName", e.target.value)} className="mt-2 w-full rounded-lg border border-fog px-3 py-3 outline-none focus:border-primary-rose" />
            </label>
          </div>

          <label className="block text-sm font-medium text-ink">
            Email
            <input required type="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="mt-2 w-full rounded-lg border border-fog px-3 py-3 outline-none focus:border-primary-rose" />
          </label>

          <label className="block text-sm font-medium text-ink">
            Password
            <input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(e) => update("password", e.target.value)} className="mt-2 w-full rounded-lg border border-fog px-3 py-3 outline-none focus:border-primary-rose" />
            <span className="mt-1 block text-xs text-ink/60">Use at least 8 characters.</span>
          </label>

          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary-plum px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-60">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/70">
          Already have an account?{" "}
          <Link href={ROUTES.login} className="font-semibold text-primary-plum underline-offset-4 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
