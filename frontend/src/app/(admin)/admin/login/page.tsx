"use client";
import { useState } from "react";
import { Button } from "@/components/basic/Button";
import { Input } from "@/components/basic/Input";
import { Alert } from "@/components/composite/Alert";
import { useAdminAuth, AdminApiError } from "@/admin/lib/admin-auth-context";

type Step = "credentials" | "phone" | "otp";

export default function AdminLoginPage() {
  const { login, sendOtp, loginWithOtp } = useAdminAuth();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      setStep("phone");
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await sendOtp(phoneNumber);
      setDevOtp(result.devOtp ?? null);
      setStep("otp");
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Couldn't send code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithOtp(phoneNumber, code);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Invalid or expired code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-md bg-white p-8 shadow-rest">
        <h1 className="font-display text-[24px] font-semibold text-primary-plum">Silku Admin</h1>
        <p className="mt-1 text-[13px] text-stone">
          {step === "credentials" && "Step 1 of 2 — Sign in with your admin credentials."}
          {step === "phone" && "Step 2 of 2 — Confirm your admin phone number."}
          {step === "otp" && "Step 2 of 2 — Enter the phone verification code."}
        </p>

        <div className="mt-5 flex items-center gap-2 text-[12px] font-semibold">
          <span className={`rounded-full px-3 py-1 ${step === "credentials" ? "bg-primary-plum text-white" : "bg-fog text-charcoal"}`}>1 Password</span>
          <span className={`rounded-full px-3 py-1 ${step !== "credentials" ? "bg-primary-plum text-white" : "bg-fog text-charcoal"}`}>2 Phone OTP</span>
        </div>

        {error && <div className="mt-4"><Alert tone="error">{error}</Alert></div>}

        {devOtp && step === "otp" && (
          <div className="mt-4">
            <Alert tone="information">
              Dev mode — SMS gateway is not live yet. Your OTP is <strong>{devOtp}</strong>.
            </Alert>
          </div>
        )}

        {step === "credentials" && (
          <form onSubmit={handleCredentials} className="mt-6 flex flex-col gap-4">
            <Input label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>Continue</Button>
          </form>
        )}

        {step === "phone" && (
          <form onSubmit={handleSendOtp} className="mt-6 flex flex-col gap-4">
            <Input label="Admin phone number" type="tel" autoComplete="tel" placeholder="+919999999999" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
            <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>Send OTP</Button>
            <button type="button" onClick={() => { setStep("credentials"); setError(null); }} className="text-[13px] text-stone underline">Back to password</button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="mt-6 flex flex-col gap-4">
            <p className="text-[13px] text-stone">Enter the 6-digit OTP for {phoneNumber}.</p>
            <Input label="OTP" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} required />
            <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>Verify & Sign In</Button>
            <button type="button" onClick={() => { setStep("phone"); setDevOtp(null); setError(null); }} className="text-[13px] text-stone underline">Use another phone number</button>
          </form>
        )}
      </div>
    </div>
  );
}
