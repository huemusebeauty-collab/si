import { SocialAccount, SocialAccountManager } from "./social-account-manager";

export type AutomationMode = "running" | "paused";

export interface MarketingControlStatus {
  automation: AutomationMode;
  socialAccounts: SocialAccount[];
  connectedCount: number;
  automationEnabledCount: number;
  healthyCount: number;
  pausedCount: number;
  generatedAt: string;
}

export class MarketingControlCenter {
  constructor(private readonly accounts = new SocialAccountManager()) {}

  getAccounts(): SocialAccount[] {
    return this.accounts.list();
  }

  pauseAll(): MarketingControlStatus {
    for (const account of this.accounts.list()) {
      if (account.status === "connected") this.accounts.pause(account.accountId);
    }
    return this.status();
  }

  resumeAll(): MarketingControlStatus {
    for (const account of this.accounts.list()) {
      if (account.status === "paused") {
        try {
          this.accounts.resume(account.accountId);
        } catch {
          // Keep unhealthy accounts paused; one bad account must not stop others.
        }
      }
    }
    return this.status();
  }

  pauseAccount(accountId: string): MarketingControlStatus {
    this.accounts.pause(accountId);
    return this.status();
  }

  resumeAccount(accountId: string): MarketingControlStatus {
    this.accounts.resume(accountId);
    return this.status();
  }

  status(): MarketingControlStatus {
    const socialAccounts = this.accounts.list();
    const connectedCount = socialAccounts.filter((a) => a.status === "connected").length;
    const automationEnabledCount = socialAccounts.filter((a) => a.automationEnabled).length;
    const healthyCount = socialAccounts.filter((a) => a.status === "connected").length;
    const pausedCount = socialAccounts.filter((a) => a.status === "paused").length;

    return {
      automation: automationEnabledCount > 0 ? "running" : "paused",
      socialAccounts,
      connectedCount,
      automationEnabledCount,
      healthyCount,
      pausedCount,
      generatedAt: new Date().toISOString(),
    };
  }
}
