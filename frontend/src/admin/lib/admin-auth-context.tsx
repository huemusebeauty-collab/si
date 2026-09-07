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
  logout: () => void;
}

export const AdminAuthContext = createContext<AdminAuthState | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<AdminRole | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedRole = window.localStorage.getItem("hmb_admin_role") as AdminRole | null;
    const storedEmail = window.localStorage.getItem("hmb_admin_email");
    if (storedRole) setRole(storedRole);
    if (storedEmail) setEmail(storedEmail);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (loginEmail: string, password: string) => {
    const result = await adminApi.login(loginEmail, password);
    setToken(result.sessionToken);
    window.localStorage.setItem("hmb_admin_role", result.role);
    window.localStorage.setItem("hmb_admin_email", loginEmail);
    setRole(result.role as AdminRole);
    setEmail(loginEmail);
    router.push("/admin/dashboard");
  }, [router]);

  const sendOtp = useCallback(async (phoneNumber: string) => {
    const result = await adminApi.sendOtp(phoneNumber);
    return { devOtp: result.devOtp };
  }, []);

  const loginWithOtp = useCallback(async (phoneNumber: string, code: string) => {
    const result = await adminApi.verifyOtp(phoneNumber, code);
    setToken(result.sessionToken);
    window.localStorage.setItem("hmb_admin_role", result.role);
    window.localStorage.setItem("hmb_admin_email", phoneNumber);
    setRole(result.role as AdminRole);
    setEmail(phoneNumber);
    router.push("/admin/dashboard");
  }, [router]);

  const logout = useCallback(() => {
    setToken(null);
    window.localStorage.removeItem("hmb_admin_role");
    window.localStorage.removeItem("hmb_admin_email");
    setRole(null);
    setEmail(null);
    router.push("/admin/login");
  }, [router]);

  return (
    <AdminAuthContext.Provider value={{ role, email, isLoading, login, sendOtp, loginWithOtp, logout }}>
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
