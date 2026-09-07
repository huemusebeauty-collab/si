"use client";
import { useState } from "react";
import { Button } from "@/components/basic/Button";
import { Input } from "@/components/basic/Input";
import { Alert } from "@/components/composite/Alert";
import { useAdminAuth, AdminApiError } from "@/admin/lib/admin-auth-context";

type Mode = "password" | "otp";
type OtpStep = "phone" | "code";

export default function AdminLoginPage() {
  const { login, sendOtp, loginWithOtp } = useAdminAuth();
  const [mode, setMode] = useState<Mode>("password");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [otpStep, setOtpStep] = useState<OtpStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setOtpStep("phone");
    setCode("");
    setDevOtp(null);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
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
      setOtpStep("code");
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
        <h1 className="font-display text-[24px] font-semibold text-primary-plum">Hue Muse Admin</h1>
        <p className="mt-1 text-[13px] text-stone">Sign in to the admin dashboard.</p>

        <div className="mt-6 flex rounded-md border border-fog p-1">
          <button
            type="button"
            onClick={() => switchMode("password")}
            className={`flex-1 rounded py-2 text-[13px] font-semibold ${mode === "password" ? "bg-primary-plum text-white" : "text-charcoal"}`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => switchMode("otp")}
            className={`flex-1 rounded py-2 text-[13px] font-semibold ${mode === "otp" ? "bg-primary-plum text-white" : "text-charcoal"}`}
          >
            Phone OTP
          </button>
        </div>

        {error && (
          <div className="mt-4">
            <Alert tone="error">{error}</Alert>
          </div>
        )}

        {devOtp && (
          <div className="mt-4">
            <Alert tone="information">
              Dev mode (no SMS gateway configured): your code is <strong>{devOtp}</strong>
            </Alert>
          </div>
        )}

        {mode === "password" && (
          <form onSubmit={handlePasswordSubmit} className="mt-6 flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
              Sign In
            </Button>
          </form>
        )}

        {mode === "otp" && otpStep === "phone" && (
          <form onSubmit={handleSendOtp} className="mt-6 flex flex-col gap-4">
            <Input
              label="Phone number"
              type="tel"
              autoComplete="tel"
              placeholder="+919999999999"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
              Send Code
            </Button>
          </form>
        )}

        {mode === "otp" && otpStep === "code" && (
          <form onSubmit={handleVerifyOtp} className="mt-6 flex flex-col gap-4">
            <p className="text-[13px] text-stone">Enter the 6-digit code sent to {phoneNumber}.</p>
            <Input
              label="Code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
              Verify & Sign In
            </Button>
            <button
              type="button"
              onClick={() => {
                setOtpStep("phone");
                setDevOtp(null);
              }}
              className="text-[13px] text-stone underline"
            >
              Use a different number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
