import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { SendSmsInput, SendSmsResult, SmsProvider } from "../sms-provider.interface";

// Sprint 5.5/5.10 — Mock SMS Provider: does NOT send a real SMS (out of
// scope). Retains recent messages in memory for test/dev inspection,
// same pattern as MockEmailProvider.
@Injectable()
export class MockSmsProvider implements SmsProvider {
  readonly name = "mock";
  private readonly logger = new Logger("MockSmsProvider");
  private readonly sentMessages: (SendSmsInput & { providerMessageId: string; sentAt: string })[] = [];

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const providerMessageId = `mock_sms_${randomUUID()}`;
    this.sentMessages.unshift({ ...input, providerMessageId, sentAt: new Date().toISOString() });
    if (this.sentMessages.length > 100) this.sentMessages.pop();
    this.logger.log(`SMS "sent" to ${input.to}: "${input.message}" (${providerMessageId})`);
    return { providerMessageId, status: "sent" };
  }

  getSentMessages() {
    return this.sentMessages;
  }
}
