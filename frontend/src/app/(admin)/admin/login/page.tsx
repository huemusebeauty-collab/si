"use client";
import { useState } from "react";
import { Button } from "@/components/basic/Button";
import { Input } from "@/components/basic/Input";
import { Alert } from "@/components/composite/Alert";
import { useAdminAuth, AdminApiError } from "@/admin/lib/admin-auth-context";

type LoginStep = "credentials" | "phone" | "otp";
type ResetStep = "request" | "otp" | "new-password";

type ResetState = {
  resetToken: string;
  phoneNumber: string;
  devOtp?: string;
};

export default function AdminLoginPage() {
  const { login, sendOtp, loginWithOtp, requestPasswordReset, confirmPasswordReset } = useAdminAuth();
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [loginStep, setLoginStep] = useState<LoginStep>("credentials");
  const [resetStep, setResetStep] = useState<ResetStep>("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resetState, setResetState] = useState<ResetState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetErrors() {
    setError(null);
    setDevOtp(null);
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    resetErrors();
    setIsSubmitting(true);
    try {
      await login(email, password);
      setLoginStep("phone");
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    resetErrors();
    setIsSubmitting(true);
    try {
      const result = await sendOtp(phoneNumber);
      setDevOtp(result.devOtp ?? null);
      setLoginStep("otp");
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Couldn't send code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    resetErrors();
    setIsSubmitting(true);
    try {
      await loginWithOtp(phoneNumber, code);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Invalid or expired code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    resetErrors();
    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(email, phoneNumber);
      setResetState(result);
      setDevOtp(result.devOtp ?? null);
      setResetStep("otp");
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Couldn't start password reset. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetOtp(e: React.FormEvent) {
    e.preventDefault();
    resetErrors();
    if (!resetState?.resetToken) {
      setError("Your reset request has expired. Please start again.");
      return;
    }
    setResetStep("new-password");
  }

  async function handleNewPassword(e: React.FormEvent) {
    e.preventDefault();
    resetErrors();
    if (newPassword.length < 12) {
      setError("New password must be at least 12 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!resetState?.resetToken) {
      setError("Your reset request has expired. Please start again.");
      return;
    }
    setIsSubmitting(true);
    try {
      await confirmPasswordReset(resetState.resetToken, code, newPassword);
      setMode("login");
      setLoginStep("credentials");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setCode("");
      setResetState(null);
      setError("Password reset successful. Please sign in with your new password.");
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Couldn't reset password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-3 py-4 sm:px-4 sm:py-6">
      <div className="w-full max-w-md rounded-md bg-white p-5 shadow-rest sm:p-8">
        <h1 className="font-display text-[22px] font-semibold leading-tight text-primary-plum sm:text-[24px]">Silku Admin</h1>
        <p className="mt-1 text-[13px] text-stone">
          {mode === "login" && loginStep === "credentials" && "Step 1 of 2 — Sign in with your admin credentials."}
          {mode === "login" && loginStep === "phone" && "Step 2 of 2 — Confirm your admin phone number."}
          {mode === "login" && loginStep === "otp" && "Step 2 of 2 — Enter the phone verification code."}
          {mode === "reset" && resetStep === "request" && "Reset your admin password with your registered phone."}
          {mode === "reset" && resetStep === "otp" && "Enter the verification code sent to your registered phone."}
          {mode === "reset" && resetStep === "new-password" && "Choose a new admin password."}
        </p>

        {mode === "login" && (
          <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-semibold sm:text-[12px]">
            <span className={`rounded-full px-2.5 py-1 sm:px-3 ${loginStep === "credentials" ? "bg-primary-plum text-white" : "bg-fog text-charcoal"}`}>1 Password</span>
            <span className={`rounded-full px-2.5 py-1 sm:px-3 ${loginStep !== "credentials" ? "bg-primary-plum text-white" : "bg-fog text-charcoal"}`}>2 Phone OTP</span>
          </div>
        )}

        {error && <div className="mt-4"><Alert tone={error.includes("successful") ? "information" : "error"}>{error}</Alert></div>}

        {devOtp && (
          <div className="mt-4">
            <Alert tone="information">
              Dev mode — SMS gateway is not live yet. Your OTP is <strong>{devOtp}</strong>.
            </Alert>
          </div>
        )}

        {mode === "login" && loginStep === "credentials" && (
          <form onSubmit={handleCredentials} className="mt-5 flex flex-col gap-4 sm:mt-6">
            <Input label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>Continue</Button>
            <button type="button" onClick={() => { resetErrors(); setMode("reset"); setResetStep("request"); }} className="text-[13px] text-stone underline">Forgot Password?</button>
          </form>
        )}

        {mode === "login" && loginStep === "phone" && (
          <form onSubmit={handleSendOtp} className="mt-6 flex flex-col gap-4">
            <Input label="Admin phone number" type="tel" autoComplete="tel" placeholder="+919999999999" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
            <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>Send OTP</Button>
            <button type="button" onClick={() => { setLoginStep("credentials"); resetErrors(); }} className="text-[13px] text-stone underline">Back to password</button>
          </form>
        )}

        {mode === "login" && loginStep === "otp" && (
          <form onSubmit={handleVerifyOtp} className="mt-6 flex flex-col gap-4">
            <p className="text-[13px] text-stone">Enter the 6-digit OTP for {phoneNumber}.</p>
            <Input label="OTP" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} required />
            <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>Verify & Sign In</Button>
            <button type="button" onClick={() => { setLoginStep("phone"); resetErrors(); }} className="text-[13px] text-stone underline">Use another phone number</button>
          </form>
        )}

        {mode === "reset" && resetStep === "request" && (
          <form onSubmit={handleResetRequest} className="mt-6 flex flex-col gap-4">
            <Input label="Admin email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Registered phone number" type="tel" autoComplete="tel" placeholder="+919999999999" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
            <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>Send Reset OTP</Button>
            <button type="button" onClick={() => { resetErrors(); setMode("login"); setLoginStep("credentials"); }} className="text-[13px] text-stone underline">Back to sign in</button>
          </form>
        )}

        {mode === "reset" && resetStep === "otp" && (
          <form onSubmit={handleResetOtp} className="mt-6 flex flex-col gap-4">
            <p className="text-[13px] text-stone">Enter the 6-digit OTP for {resetState?.phoneNumber ?? phoneNumber}.</p>
            <Input label="OTP" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} required />
            <Button type="submit" variant="primary" fullWidth>Continue</Button>
            <button type="button" onClick={() => { resetErrors(); setResetStep("request"); }} className="text-[13px] text-stone underline">Start again</button>
          </form>
        )}

        {mode === "reset" && resetStep === "new-password" && (
          <form onSubmit={handleNewPassword} className="mt-6 flex flex-col gap-4">
            <Input label="New password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={12} required />
            <Input label="Confirm new password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={12} required />
            <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>Reset Password</Button>
            <button type="button" onClick={() => { resetErrors(); setResetStep("otp"); }} className="text-[13px] text-stone underline">Back to OTP</button>
          </form>
        )}
      </div>
    </div>
  );
}
