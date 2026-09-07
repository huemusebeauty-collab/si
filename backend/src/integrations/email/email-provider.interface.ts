// Sprint 5.4 — Email Service: provider-agnostic interface.
export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  providerMessageId: string;
  status: "sent" | "queued" | "failed";
}

export interface EmailProvider {
  readonly name: string;
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

export const EMAIL_PROVIDER = Symbol("EMAIL_PROVIDER");
