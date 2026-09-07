import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "../email-provider.interface";

// Sprint 5.4/5.10 — Mock Email Provider: does NOT send real email
// (Sprint 5 OUT OF SCOPE: "Production email/SMS sending"). Logs the
// email and retains the last 100 in memory so integration tests and a
// dev-mode "sent emails" inspection endpoint can assert against them —
// the email equivalent of Sprint 1's MailHog, but at the application
// layer rather than SMTP layer (no SMTP server needed for the mock path at all).
@Injectable()
export class MockEmailProvider implements EmailProvider {
  readonly name = "mock";
  private readonly logger = new Logger("MockEmailProvider");
  private readonly sentEmails: (SendEmailInput & { providerMessageId: string; sentAt: string })[] = [];

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const providerMessageId = `mock_email_${randomUUID()}`;
    this.sentEmails.unshift({ ...input, providerMessageId, sentAt: new Date().toISOString() });
    if (this.sentEmails.length > 100) this.sentEmails.pop();
    this.logger.log(`Email "sent" to ${input.to}: "${input.subject}" (${providerMessageId})`);
    return { providerMessageId, status: "sent" };
  }

  // Sprint 5.10 — test/dev inspection helper.
  getSentEmails() {
    return this.sentEmails;
  }
}
