import { createHash } from "crypto";
import { UnauthorizedException } from "@nestjs/common";
import { AdminAuthService } from "./admin-auth.service";

describe("AdminAuthService refresh-token revocation", () => {
  const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

  let service: AdminAuthService;
  let adminUsers: any;
  let jwt: any;
  let config: any;
  let auditLog: any;
  let queryBuilder: any;

  const admin = (overrides: Record<string, unknown> = {}) => ({
    id: "admin-1",
    email: "admin@silku.in",
    role: "super_admin",
    active: true,
    refreshTokenHash: tokenHash("refresh-current"),
    ...overrides,
  });

  beforeEach(() => {
    queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(admin()),
    };
    adminUsers = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn().mockResolvedValue(admin()),
    };
    jwt = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: "admin-1",
        email: "admin@silku.in",
        role: "super_admin",
        purpose: "admin_refresh",
      }),
      signAsync: jest.fn()
        .mockResolvedValueOnce("new-access-token")
        .mockResolvedValueOnce("refresh-next"),
    };
    config = { get: jest.fn((key: string) => key === "jwt.secret" ? "test-secret" : "15m") };
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };
    service = new AdminAuthService(adminUsers, jwt, config, auditLog);
  });

  it("rotates the stored hash and returns a new refresh token", async () => {
    const result = await service.refreshSession("refresh-current");

    expect(adminUsers.createQueryBuilder).toHaveBeenCalledWith("admin");
    expect(queryBuilder.addSelect).toHaveBeenCalledWith("admin.refreshTokenHash");
    expect(adminUsers.update).toHaveBeenCalledWith(
      { id: "admin-1", refreshTokenHash: tokenHash("refresh-current") },
      { refreshTokenHash: tokenHash("refresh-next") },
    );
    expect(result).toMatchObject({
      sessionToken: "new-access-token",
      refreshToken: "refresh-next",
      role: "super_admin",
    });
  });

  it("rejects a refresh token whose hash is no longer current", async () => {
    queryBuilder.getOne.mockResolvedValue(admin({ refreshTokenHash: tokenHash("another-token") }));

    await expect(service.refreshSession("refresh-current"))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(adminUsers.update).not.toHaveBeenCalled();
  });

  it("rejects when another request has already rotated the token", async () => {
    adminUsers.update.mockResolvedValue({ affected: 0 });

    await expect(service.refreshSession("refresh-current"))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects inactive admins even when the token hash matches", async () => {
    queryBuilder.getOne.mockResolvedValue(admin({ active: false }));

    await expect(service.refreshSession("refresh-current"))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(adminUsers.update).not.toHaveBeenCalled();
  });

  it("clears the refresh hash and writes an audit event on logout", async () => {
    await expect(service.logout("admin-1")).resolves.toEqual({ loggedOut: true });

    expect(adminUsers.update).toHaveBeenCalledWith(
      { id: "admin-1" },
      { refreshTokenHash: null },
    );
    expect(auditLog.record).toHaveBeenCalledWith({
      actorId: "admin-1",
      actorEmail: "admin@silku.in",
      module: "auth",
      action: "logout",
    });
  });

  it("rejects logout for a missing admin", async () => {
    adminUsers.findOne.mockResolvedValue(null);

    await expect(service.logout("missing-admin"))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(adminUsers.update).not.toHaveBeenCalled();
    expect(auditLog.record).not.toHaveBeenCalled();
  });
});
