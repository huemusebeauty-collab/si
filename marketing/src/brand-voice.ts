export type BrandTone = "warm" | "friendly" | "premium" | "helpful" | "playful";

export interface BrandVoiceProfile {
  brandName: string;
  tones: BrandTone[];
  avoid: string[];
  languages: string[];
  humanStyle: true;
  neverPretendToBeHuman: true;
}

export interface ReplyContext {
  customerName?: string;
  language: string;
  message: string;
  productName?: string;
  productFacts?: string[];
  offer?: string;
}

export interface BrandReply {
  text: string;
  language: string;
  tone: BrandTone[];
  humanStyle: true;
  confidence: number;
  requiresHumanReview: boolean;
}

const DEFAULT_VOICE: BrandVoiceProfile = {
  brandName: "Silku",
  tones: ["warm", "friendly", "helpful", "premium"],
  avoid: ["spam", "fake urgency", "guaranteed results", "medical claims", "impersonation"],
  languages: ["en", "hi", "es", "fr"],
  humanStyle: true,
  neverPretendToBeHuman: true,
};

export class BrandVoiceEngine {
  private readonly profile: BrandVoiceProfile;

  constructor(profile: Partial<BrandVoiceProfile> = {}) {
    this.profile = {
      ...DEFAULT_VOICE,
      ...profile,
      tones: profile.tones ?? DEFAULT_VOICE.tones,
      avoid: profile.avoid ?? DEFAULT_VOICE.avoid,
      languages: profile.languages ?? DEFAULT_VOICE.languages,
    };
  }

  getProfile(): BrandVoiceProfile {
    return {
      ...this.profile,
      tones: [...this.profile.tones],
      avoid: [...this.profile.avoid],
      languages: [...this.profile.languages],
    };
  }

  draftReply(context: ReplyContext): BrandReply {
    const language = this.profile.languages.includes(context.language) ? context.language : "en";
    const sensitive = /refund|fraud|legal|chargeback|scam|medical|allergy|complaint/i.test(context.message);
    const greeting = context.customerName ? `Hi ${context.customerName}! ` : "Hi! ";

    let text: string;
    if (language.startsWith("hi")) {
      text = `${greeting}Silku se message karne ke liye thank you 😊 ${context.offer ?? "Aapki help karke humein khushi hogi."}`;
    } else if (language.startsWith("es")) {
      text = `${greeting}¡Gracias por escribir a Silku! 😊 ${context.offer ?? "Estamos encantados de ayudarte."}`;
    } else if (language.startsWith("fr")) {
      text = `${greeting}Merci d’avoir écrit à Silku ! 😊 ${context.offer ?? "Nous serons ravis de vous aider."}`;
    } else {
      text = `${greeting}Thanks for reaching out to Silku 😊 ${context.offer ?? "We’d be happy to help."}`;
    }

    return {
      text,
      language,
      tone: [...this.profile.tones],
      humanStyle: true,
      confidence: sensitive ? 0.55 : 0.9,
      requiresHumanReview: sensitive,
    };
  }
}
