"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi, setToken, AdminApiError } from "./admin-api-client";
import type { AdminRole } from "./permissions";

interface AdminAuthState {
  role: AdminRole | null;
  email: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  sendOtp: (phoneNumber: string) => Promise<{ devOtp?: string }>;
  loginWithOtp: (phoneNumber: string, code: string) => Promise<void>;
  requestPasswordReset: (email: string, phoneNumber: string) => Promise<{ resetToken: string; devOtp?: string; phoneNumber: string }>;
  confirmPasswordReset: (resetToken: string, code: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

export const AdminAuthContext = createContext<AdminAuthState | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<AdminRole | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const challengeTokenKey = "hmb_admin_challenge_token";
  const pendingEmailKey = "hmb_admin_pending_email";

  useEffect(() => {
    const storedRole = window.localStorage.getItem("hmb_admin_role") as AdminRole | null;
    const storedEmail = window.localStorage.getItem("hmb_admin_email");
    const token = window.localStorage.getItem("hmb_admin_token");
    if (storedRole && storedEmail && token) {
      setRole(storedRole);
      setEmail(storedEmail);
    } else {
      setToken(null);
      window.localStorage.removeItem("hmb_admin_role");
      window.localStorage.removeItem("hmb_admin_email");
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (loginEmail: string, password: string) => {
    const result = await adminApi.login(loginEmail, password);
    setToken(null);
    window.localStorage.setItem(challengeTokenKey, result.sessionToken);
    window.localStorage.setItem(pendingEmailKey, loginEmail.trim().toLowerCase());
    window.localStorage.removeItem("hmb_admin_role");
    window.localStorage.removeItem("hmb_admin_email");
    setRole(null);
    setEmail(null);
  }, []);

  const sendOtp = useCallback(async (phoneNumber: string) => {
    const challengeToken = window.localStorage.getItem(challengeTokenKey);
    if (!challengeToken) throw new Error("Your login session has expired. Please sign in again.");
    const result = await adminApi.sendOtp(phoneNumber, challengeToken);
    return { devOtp: result.devOtp };
  }, []);

  const loginWithOtp = useCallback(async (phoneNumber: string, code: string) => {
    const challengeToken = window.localStorage.getItem(challengeTokenKey);
    if (!challengeToken) throw new Error("Your login session has expired. Please sign in again.");
    const result = await adminApi.verifyOtp(phoneNumber, code, challengeToken);
    const loginEmail = window.localStorage.getItem(pendingEmailKey) ?? "admin";
    window.localStorage.removeItem(challengeTokenKey);
    window.localStorage.removeItem(pendingEmailKey);
    setToken(result.sessionToken);
    window.localStorage.setItem("hmb_admin_role", result.role);
    window.localStorage.setItem("hmb_admin_email", loginEmail);
    setRole(result.role as AdminRole);
    setEmail(loginEmail);
    router.push("/admin/dashboard");
  }, [router]);

  const requestPasswordReset = useCallback(async (resetEmail: string, phoneNumber: string) => {
    return adminApi.requestPasswordReset(resetEmail, phoneNumber);
  }, []);

  const confirmPasswordReset = useCallback(async (resetToken: string, code: string, newPassword: string) => {
    await adminApi.confirmPasswordReset(resetToken, code, newPassword);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    window.localStorage.removeItem("hmb_admin_role");
    window.localStorage.removeItem("hmb_admin_email");
    window.localStorage.removeItem("hmb_admin_pending_email");
    window.localStorage.removeItem("hmb_admin_challenge_token");
    setRole(null);
    setEmail(null);
    router.push("/admin/login");
  }, [router]);

  return (
    <AdminAuthContext.Provider value={{ role, email, isLoading, login, sendOtp, loginWithOtp, requestPasswordReset, confirmPasswordReset, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthState {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}

export { AdminApiError };
