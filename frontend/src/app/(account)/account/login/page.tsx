"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ROUTES } from "@/constants/routes";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

type LoginResponse = {
  data?: { sessionToken?: string; expiresAt?: string };
  sessionToken?: string;
  expiresAt?: string;
  message?: string;
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await response.json()) as LoginResponse;
      const result = body.data ?? body;

      if (!response.ok || !result.sessionToken) {
        throw new Error(body.message || "Invalid email or password.");
      }

      sessionStorage.setItem("silku_session_token", result.sessionToken);
      if (result.expiresAt) sessionStorage.setItem("silku_session_expires_at", result.expiresAt);
      window.location.assign(ROUTES.account);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-12 sm:py-16">
      <div className="rounded-2xl border border-fog bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-rose">Welcome back</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Sign in to Hue Muse</h1>
        <p className="mt-2 text-sm text-ink/70">Access your orders, wishlist and account.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-ink">
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-fog px-3 py-3 outline-none focus:border-primary-rose"
            />
          </label>

          <label className="block text-sm font-medium text-ink">
            Password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-fog px-3 py-3 outline-none focus:border-primary-rose"
            />
          </label>

          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary-plum px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/70">
          New to Hue Muse?{" "}
          <Link href={ROUTES.register} className="font-semibold text-primary-plum underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
