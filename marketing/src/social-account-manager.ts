export type SocialPlatform = "instagram" | "facebook" | "youtube" | "pinterest" | "x" | "whatsapp";

export type AccountStatus = "disconnected" | "connected" | "expired" | "error" | "paused";

export interface SocialAccount {
  accountId: string;
  platform: SocialPlatform;
  displayName: string;
  status: AccountStatus;
  scopes: string[];
  connectedAt?: string;
  expiresAt?: string;
  automationEnabled: boolean;
  lastHealthCheckAt?: string;
  lastError?: string;
}

export interface SocialAccountConnectionRequest {
  accountId: string;
  platform: SocialPlatform;
  displayName: string;
  scopes: string[];
  connectedAt?: string;
  expiresAt?: string;
}

export interface AccountHealth {
  accountId: string;
  platform: SocialPlatform;
  status: AccountStatus;
  healthy: boolean;
  automationEnabled: boolean;
  checkedAt: string;
  reason?: string;
}

const REQUIRED_SCOPE_PREFIXES: Record<SocialPlatform, string[]> = {
  instagram: ["instagram"],
  facebook: ["facebook"],
  youtube: ["youtube"],
  pinterest: ["pinterest"],
  x: ["x"],
  whatsapp: ["whatsapp"],
};

export class SocialAccountManager {
  private readonly accounts = new Map<string, SocialAccount>();

  connect(request: SocialAccountConnectionRequest): SocialAccount {
    if (!request.accountId || !request.displayName) {
      throw new Error("accountId and displayName are required");
    }

    const account: SocialAccount = {
      accountId: request.accountId,
      platform: request.platform,
      displayName: request.displayName,
      status: "connected",
      scopes: [...request.scopes],
      connectedAt: request.connectedAt ?? new Date().toISOString(),
      expiresAt: request.expiresAt,
      automationEnabled: false,
    };

    this.accounts.set(account.accountId, account);
    return { ...account, scopes: [...account.scopes] };
  }

  restore(account: SocialAccount): SocialAccount {
    if (!account.accountId || !account.displayName) throw new Error("accountId and displayName are required");
    this.accounts.set(account.accountId, { ...account, scopes: [...account.scopes] });
    return { ...account, scopes: [...account.scopes] };
  }

  disconnect(accountId: string): boolean {
    return this.accounts.delete(accountId);
  }

  pause(accountId: string): SocialAccount {
    const account = this.require(accountId);
    account.status = "paused";
    account.automationEnabled = false;
    return { ...account, scopes: [...account.scopes] };
  }

  resume(accountId: string): SocialAccount {
    const account = this.require(accountId);
    if (account.status === "expired" || account.status === "error") {
      throw new Error("Account must be healthy before automation can resume");
    }
    account.status = "connected";
    account.automationEnabled = true;
    return { ...account, scopes: [...account.scopes] };
  }

  setAutomation(accountId: string, enabled: boolean): SocialAccount {
    const account = this.require(accountId);
    if (enabled && account.status !== "connected") {
      throw new Error("Only connected accounts can enable automation");
    }
    account.automationEnabled = enabled;
    if (!enabled && account.status === "connected") {
      account.status = "paused";
    } else if (enabled) {
      account.status = "connected";
    }
    return { ...account, scopes: [...account.scopes] };
  }

  list(): SocialAccount[] {
    return [...this.accounts.values()].map((account) => ({
      ...account,
      scopes: [...account.scopes],
    }));
  }

  healthCheck(accountId: string, now = new Date()): AccountHealth {
    const account = this.require(accountId);
    const checkedAt = now.toISOString();
    account.lastHealthCheckAt = checkedAt;

    const expectedPrefix = REQUIRED_SCOPE_PREFIXES[account.platform][0];
    const hasPlatformScope = account.scopes.some((scope) => scope.toLowerCase().startsWith(expectedPrefix));
    const expired = Boolean(account.expiresAt && new Date(account.expiresAt).getTime() <= now.getTime());

    if (expired) {
      account.status = "expired";
      account.automationEnabled = false;
    } else if (!hasPlatformScope) {
      account.status = "error";
      account.automationEnabled = false;
      account.lastError = "Required platform scope is missing";
    }

    const healthy = account.status === "connected";
    return {
      accountId: account.accountId,
      platform: account.platform,
      status: account.status,
      healthy,
      automationEnabled: account.automationEnabled,
      checkedAt,
      reason: healthy ? undefined : account.lastError ?? "Account is not connected",
    };
  }

  private require(accountId: string): SocialAccount {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Social account not found: ${accountId}`);
    }
    return account;
  }
}
