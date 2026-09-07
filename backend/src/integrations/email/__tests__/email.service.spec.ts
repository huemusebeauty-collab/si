import { Test, TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "../email.service";
import { EMAIL_PROVIDER } from "../email-provider.interface";
import { QUEUE_NAMES } from "@/integrations/queue/queue.constants";
import { SettingsService } from "@/admin/settings/settings.service";

// Sprint 7.5 — Business Rule Test: EmailService's DB-override fallback
// is the load-bearing piece of Sprint 7.5's "notification templates
// configurable via Settings" deliverable — a bug here would silently
// break every transactional email if a template row was ever
// half-configured. Confirms both directions: an override is used when
// present, and the hardcoded Sprint 5.4 default is used when absent.
describe("EmailService — notification template resolution", () => {
  let service: EmailService;
  let queueAdd: jest.Mock;
  let getOverride: jest.Mock;

  beforeEach(async () => {
    queueAdd = jest.fn().mockResolvedValue(undefined);
    getOverride = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: EMAIL_PROVIDER, useValue: { name: "mock", send: jest.fn() } },
        { provide: getQueueToken(QUEUE_NAMES.EMAIL), useValue: { add: queueAdd } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: SettingsService, useValue: { getNotificationTemplateOverride: getOverride } },
      ],
    }).compile();
    service = module.get(EmailService);
  });

  it("uses the hardcoded Sprint 5.4 default when no DB override exists", async () => {
    getOverride.mockResolvedValue(null);
    await service.sendWelcomeEmail("test@example.com", "Amelia");
    const enqueuedJob = queueAdd.mock.calls[0][1];
    expect(enqueuedJob.subject).toBe("Welcome to Hue Muse Beauty");
    expect(enqueuedJob.html).toContain("Amelia");
  });

  it("uses the DB override, rendered with the real variables, when one exists", async () => {
    getOverride.mockResolvedValue({
      templateKey: "welcome",
      subject: "Custom Welcome Subject",
      html: "<p>Hey {{firstName}}, this is a custom template!</p>",
      text: "Hey {{firstName}}, custom text.",
    });
    await service.sendWelcomeEmail("test@example.com", "Amelia");
    const enqueuedJob = queueAdd.mock.calls[0][1];
    expect(enqueuedJob.subject).toBe("Custom Welcome Subject");
    expect(enqueuedJob.html).toBe("<p>Hey Amelia, this is a custom template!</p>");
  });

  it("checks for an override separately for each template type (orderConfirmation)", async () => {
    getOverride.mockResolvedValue(null);
    await service.sendOrderConfirmation("test@example.com", "Amelia", "ORD-123", "$45.00");
    expect(getOverride).toHaveBeenCalledWith("orderConfirmation");
  });
});
