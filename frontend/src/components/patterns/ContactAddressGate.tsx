"use client";

import { FormEvent, useState } from "react";

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
      fullName: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      address: String(form.get("address") || ""),
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://silku-backend.onrender.com"}/v1/contact-leads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error("Unable to submit details");
      }

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
        <p className="mt-2 text-base text-charcoal">
          99, Nimera, Jaipur, Rajasthan 303005, India.
        </p>
        <p className="mt-2 text-sm text-charcoal">
          Legal business name: Shree Khatu Shyam Health Care. GSTIN: 08FYZPB1721H1Z7.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-sand bg-cream p-5">
      <h2 className="font-display text-xl font-semibold text-ink">View business address</h2>
      <p className="mt-2 text-sm text-charcoal">
        Please submit your complete details and phone number to view the full business address.
      </p>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
        <label className="grid gap-1 text-sm text-charcoal">
          Full name
          <input name="name" required autoComplete="name" className="rounded-md border border-sand bg-white px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm text-charcoal">
          Email address
          <input name="email" type="email" required autoComplete="email" className="rounded-md border border-sand bg-white px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm text-charcoal">
          Phone number
          <input name="phone" type="tel" required autoComplete="tel" className="rounded-md border border-sand bg-white px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm text-charcoal">
          Complete address
          <textarea name="address" required autoComplete="street-address" rows={3} className="rounded-md border border-sand bg-white px-3 py-2" />
        </label>
        <button disabled={loading} type="submit" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">
          {loading ? "Submitting..." : "Submit & View Address"}
        </button>
      </form>
    </div>
  );
}
