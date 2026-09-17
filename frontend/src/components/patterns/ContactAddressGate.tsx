"use client";

import { FormEvent, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://silku-backend.onrender.com/v1";

export function ContactAddressGate() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      full_name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      address: String(form.get("address") || ""),
    };

    try {
      const response = await fetch(`${API_BASE}/contact-leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Unable to submit details");
      setSubmitted(true);
    } catch {
      setError("Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-6 rounded-lg border border-sand bg-cream p-5" aria-live="polite">
        <h2 className="font-display text-xl font-semibold text-ink">Business address</h2>
        <p className="mt-2 text-base text-charcoal">99, Nimera, Jaipur, Rajasthan 303005, India.</p>
        <p className="mt-2 text-sm text-charcoal">Legal business name: Shree Khatu Shyam Health Care. GSTIN: 08FYZPB1721H1Z7.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-sand bg-cream p-5">
      <h2 className="font-display text-xl font-semibold text-ink">View business address</h2>
      <p className="mt-2 text-sm text-charcoal">Please submit your complete details and phone number to view the full business address.</p>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
        <input name="name" required placeholder="Full name" className="rounded-md border border-sand bg-white px-3 py-2" />
        <input name="email" type="email" required placeholder="Email address" className="rounded-md border border-sand bg-white px-3 py-2" />
        <input name="phone" type="tel" required placeholder="Phone number" className="rounded-md border border-sand bg-white px-3 py-2" />
        <textarea name="address" required placeholder="Complete address" rows={3} className="rounded-md border border-sand bg-white px-3 py-2" />
        <button disabled={loading} type="submit" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {loading ? "Submitting..." : "Submit & View Address"}
        </button>
      </form>
    </div>
  );
}
