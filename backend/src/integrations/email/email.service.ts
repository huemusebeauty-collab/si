import { Inject, Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { EMAIL_PROVIDER, type EmailProvider } from "./email-provider.interface";
import { EMAIL_TEMPLATES } from "./templates/templates";
import { renderTemplate } from "./templates/template.engine";
import { QUEUE_NAMES } from "@/integrations/queue/queue.constants";
import { ConfigService } from "@nestjs/config";
import { SettingsService } from "@/admin/settings/settings.service";

// Sprint 5.4 — EmailService: the only thing other modules (Orders,
// Auth, Reviews, ...) should call for outbound email. Every send goes
// through the queue (Sprint 5.8 — "Queue support" is this module's own
// explicit deliverable) rather than sending inline during the HTTP
// request — an order confirmation email should never make checkout
// slower or fail the order if the email provider is briefly down.
//
// Sprint 7.5 correction: every template send now checks
// SettingsService for a DB-backed override FIRST (Sprint 7.5's new
// NotificationTemplateEntity — admin-editable, closing the gap flagged
// since Sprint 7.3/7.4), falling back to the Sprint 5.4 hardcoded
// EMAIL_TEMPLATES when no override exists. The fallback is deliberate
// and load-bearing: a template table that's never been seeded/edited
// must not break transactional email — this is why
// SettingsService.getNotificationTemplateOverride() returns `null`
// rather than throwing.
@Injectable()
export class EmailService {
  constructor(
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  private async enqueue(to: string, template: { subject: string; html: string; text: string }): Promise<void> {
    await this.emailQueue.add("send-email", {
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  // Sprint 7.5 — resolves a template by key: DB override (rendered
  // through the same `renderTemplate` engine the hardcoded templates
  // use) if one exists, otherwise the hardcoded Sprint 5.4 default.
  private async resolveTemplate(
    templateKey: keyof typeof EMAIL_TEMPLATES,
    vars: Record<string, string | number>,
  ): Promise<{ subject: string; html: string; text: string }> {
    const override = await this.settings.getNotificationTemplateOverride(templateKey);
    if (override) {
      return {
        subject: renderTemplate(override.subject, vars),
        html: renderTemplate(override.html, vars),
        text: renderTemplate(override.text, vars),
      };
    }
    return (EMAIL_TEMPLATES[templateKey] as (v: typeof vars) => { subject: string; html: string; text: string })(vars);
  }

  async sendWelcomeEmail(to: string, firstName: string): Promise<void> {
    await this.enqueue(to, await this.resolveTemplate("welcome", { firstName }));
  }

  async sendOrderConfirmation(to: string, firstName: string, orderId: string, total: string): Promise<void> {
    await this.enqueue(to, await this.resolveTemplate("orderConfirmation", { firstName, orderId, total }));
  }

  async sendPasswordReset(to: string, firstName: string, resetLink: string): Promise<void> {
    await this.enqueue(to, await this.resolveTemplate("passwordReset", { firstName, resetLink }));
  }

  async sendShipmentNotification(to: string, firstName: string, orderId: string, trackingNumber: string): Promise<void> {
    await this.enqueue(to, await this.resolveTemplate("shipmentNotification", { firstName, orderId, trackingNumber }));
  }

  async sendRefundNotification(to: string, firstName: string, orderId: string, amount: string): Promise<void> {
    await this.enqueue(to, await this.resolveTemplate("refundNotification", { firstName, orderId, amount }));
  }

  // Sprint 5.4 — exposed for the EmailProcessor (the actual queue
  // worker) to call the real provider; EmailService itself never calls
  // the provider directly, keeping "enqueue" and "actually send"
  // cleanly separated.
  getProvider(): EmailProvider {
    return this.provider;
  }
}
