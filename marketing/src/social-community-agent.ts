export type CommunityPlatform = "instagram" | "facebook" | "youtube" | "pinterest" | "x" | "whatsapp";
export type CommunityAction = "reply_comment" | "reply_message" | "react" | "escalate" | "ignore";

export interface CommunityMessage {
  id: string;
  platform: CommunityPlatform;
  authorName?: string;
  text: string;
  language?: string;
  receivedAt: string;
  productIds?: string[];
  sentiment?: "positive" | "neutral" | "negative";
}

export interface CommunityReply {
  messageId: string;
  platform: CommunityPlatform;
  action: CommunityAction;
  language: string;
  text: string;
  humanStyle: true;
  requiresApproval: boolean;
  reason?: string;
}

export interface CommunityAgentPolicy {
  enabled: boolean;
  autoReplyComments: boolean;
  autoReplyMessages: boolean;
  multilingual: boolean;
  humanStyle: boolean;
  maxRepliesPerConversation: number;
  escalationKeywords: string[];
}

const DEFAULT_POLICY: CommunityAgentPolicy = {
  enabled: true,
  autoReplyComments: true,
  autoReplyMessages: true,
  multilingual: true,
  humanStyle: true,
  maxRepliesPerConversation: 3,
  escalationKeywords: ["refund", "fraud", "legal", "complaint", "chargeback", "scam"],
};

/**
 * Community-response foundation. It prepares safe, human-style multilingual
 * replies but deliberately does not call social APIs. Platform credentials,
 * rate limits, consent, moderation and approval rules belong to the adapters.
 */
export class SocialCommunityAgent {
  private policy: CommunityAgentPolicy = { ...DEFAULT_POLICY };

  setPolicy(policy: Partial<CommunityAgentPolicy>): CommunityAgentPolicy {
    this.policy = { ...this.policy, ...policy };
    return this.getPolicy();
  }

  getPolicy(): CommunityAgentPolicy {
    return { ...this.policy, escalationKeywords: [...this.policy.escalationKeywords] };
  }

  pause(): CommunityAgentPolicy {
    this.policy.enabled = false;
    return this.getPolicy();
  }

  resume(): CommunityAgentPolicy {
    this.policy.enabled = true;
    return this.getPolicy();
  }

  decide(message: CommunityMessage): CommunityReply {
    if (!this.policy.enabled) {
      return this.result(message, "ignore", "Automation is paused.");
    }

    const normalized = message.text.toLowerCase();
    const escalation = this.policy.escalationKeywords.some((keyword) => normalized.includes(keyword));
    if (escalation) {
      return this.result(message, "escalate", "This conversation should be handled by a human team member.", true);
    }

    if (message.platform === "whatsapp" && !this.policy.autoReplyMessages) {
      return this.result(message, "ignore", "Automatic message replies are disabled.");
    }
    if (message.platform !== "whatsapp" && !this.policy.autoReplyComments) {
      return this.result(message, "ignore", "Automatic comment replies are disabled.");
    }

    const language = message.language || "en";
    const reply = this.humanReply(message, language);
    return {
      messageId: message.id,
      platform: message.platform,
      action: message.platform === "whatsapp" ? "reply_message" : "reply_comment",
      language,
      text: reply,
      humanStyle: true,
      requiresApproval: false,
    };
  }

  private humanReply(message: CommunityMessage, language: string): string {
    // Keep generation conservative until an LLM provider and brand voice are configured.
    if (language.startsWith("hi")) return "Thanks for reaching out 😊 Silku team aapki help karne ke liye yahan hai. Aap thoda detail bata dein?";
    if (language.startsWith("es")) return "¡Gracias por escribirnos! 😊 El equipo de Silku está aquí para ayudarte. ¿Nos cuentas un poco más?";
    if (language.startsWith("fr")) return "Merci pour votre message ! 😊 L’équipe Silku est là pour vous aider. Pouvez-vous nous en dire un peu plus ?";
    return "Thanks for reaching out 😊 The Silku team is happy to help. Could you share a little more detail?";
  }

  private result(message: CommunityMessage, action: CommunityAction, reason: string, approval = true): CommunityReply {
    return {
      messageId: message.id,
      platform: message.platform,
      action,
      language: message.language || "en",
      text: "",
      humanStyle: true,
      requiresApproval: approval,
      reason,
    };
  }
}
