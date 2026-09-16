import { Inject, Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { EMAIL_PROVIDER, type EmailProvider } from "./email-provider.interface";
import { EMAIL_TEMPLATES } from "./templates/templates";
import { renderTemplate } from "./templates/template.engine";
import { QUEUE_NAMES } from "@/integrations/queue/queue.constants";
import { ConfigService } from "@nestjs/config";
import { SettingsService } from "@/admin/settings/settings.service";

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

  getProvider(): EmailProvider {
    return this.provider;
  }
}
