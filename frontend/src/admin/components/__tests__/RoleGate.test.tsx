import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoleGate } from "../RoleGate";
import { AdminAuthContext } from "@/admin/lib/admin-auth-context";
import type { AdminRole } from "@/admin/lib/permissions";

// Sprint 6B — provides the context directly (bypassing AdminAuthProvider,
// which depends on next/navigation's useRouter — not needed to test
// RoleGate's own rendering logic in isolation).
function renderWithRole(role: AdminRole | null, ui: React.ReactElement) {
  return render(
    <AdminAuthContext.Provider value={{ role, email: null, isLoading: false, login: async () => {}, logout: () => {} }}>
      {ui}
    </AdminAuthContext.Provider>,
  );
}

describe("RoleGate", () => {
  it("renders children when the role has sufficient permission", () => {
    renderWithRole("super_admin", (
      <RoleGate module="settings" level="full">
        <span>Visible content</span>
      </RoleGate>
    ));
    expect(screen.getByText("Visible content")).toBeInTheDocument();
  });

  it("does not render children when the role lacks permission", () => {
    renderWithRole("customer_support", (
      <RoleGate module="settings" level="view">
        <span>Hidden content</span>
      </RoleGate>
    ));
    expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
  });

  it("renders the fallback when permission is denied and a fallback is given", () => {
    renderWithRole("customer_support", (
      <RoleGate module="settings" level="view" fallback={<span>Fallback content</span>}>
        <span>Hidden content</span>
      </RoleGate>
    ));
    expect(screen.getByText("Fallback content")).toBeInTheDocument();
    expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
  });

  it("denies access when logged out (role is null)", () => {
    renderWithRole(null, (
      <RoleGate module="dashboard" level="view">
        <span>Should not appear</span>
      </RoleGate>
    ));
    expect(screen.queryByText("Should not appear")).not.toBeInTheDocument();
  });
});
