import { BrandVoiceEngine, ReplyContext } from "./brand-voice";
import { CommunityMessage, CommunityReply, SocialCommunityAgent } from "./social-community-agent";
import { MarketingScheduler } from "./marketing-scheduler";

export interface CommunityWorkflowResult {
  reply: CommunityReply;
  queued: boolean;
  jobKey?: string;
}

/** Connects incoming social conversations to brand voice + safety + scheduler.
 * Actual platform delivery remains behind PlatformAdapterRegistry and OAuth credentials.
 */
export class CommunityWorkflow {
  private readonly agent = new SocialCommunityAgent();
  private readonly voice = new BrandVoiceEngine();
  private readonly scheduler = new MarketingScheduler();

  handle(message: CommunityMessage, context: Omit<ReplyContext, "message" | "language"> = {}): CommunityWorkflowResult {
    const decision = this.agent.decide(message);
    if (decision.action === "ignore" || decision.action === "escalate") {
      return { reply: decision, queued: false };
    }

    const drafted = this.voice.draftReply({
      ...context,
      message: message.text,
      language: message.language || "en",
    });

    const reply: CommunityReply = {
      ...decision,
      text: drafted.text,
      language: drafted.language,
      requiresApproval: decision.requiresApproval || drafted.requiresHumanReview,
      reason: drafted.requiresHumanReview ? "Brand voice flagged this conversation for human review." : decision.reason,
    };

    if (reply.requiresApproval) return { reply, queued: false };

    const jobKey = `community:${message.platform}:${message.id}`;
    this.scheduler.schedule(jobKey, new Date().toISOString(), 3);
    return { reply, queued: true, jobKey };
  }

  pause(): void {
    this.agent.pause();
  }

  resume(): void {
    this.agent.resume();
  }

  status() {
    return { policy: this.agent.getPolicy(), jobs: this.scheduler.status(), alerts: this.scheduler.getAlerts() };
  }
}
