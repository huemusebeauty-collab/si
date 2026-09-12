import type { MarketingPersistence } from "./marketing-persistence";
import type { SocialAccount } from "./social-account-manager";
import type { SocialQueueItem } from "./social-center";

export type SocialAuditAction = "account_connected" | "account_disconnected" | "account_paused" | "account_resumed" | "account_automation_changed" | "post_scheduled" | "post_approved" | "post_status_changed";

export interface SocialAuditEntry {
  auditId: string;
  postId?: string;
  accountId?: string;
  action: SocialAuditAction;
  actor: string;
  fromStatus?: string;
  toStatus?: string;
  details: string;
  occurredAt: string;
}

export interface SocialPersistence {
  loadSocialAccounts(): Promise<SocialAccount[]>;
  saveSocialAccount(account: SocialAccount): Promise<void>;
  deleteSocialAccount(accountId: string): Promise<void>;
  loadSocialQueue(): Promise<SocialQueueItem[]>;
  saveSocialQueue(item: SocialQueueItem): Promise<void>;
  loadSocialAudit(): Promise<SocialAuditEntry[]>;
  saveSocialAudit(entry: SocialAuditEntry): Promise<void>;
}

export type MarketingSocialPersistence = MarketingPersistence & SocialPersistence;
