export interface SendSmsInput {
  to: string;
  message: string;
}

export interface SendSmsResult {
  providerMessageId: string;
  status: "sent" | "queued" | "failed";
}

export interface SmsProvider {
  readonly name: string;
  send(input: SendSmsInput): Promise<SendSmsResult>;
}

export const SMS_PROVIDER = Symbol("SMS_PROVIDER");
