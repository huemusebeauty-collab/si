import { Controller, Get, Inject } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "@/common/decorators/roles.decorator";
import { EMAIL_PROVIDER, type EmailProvider } from "./email-provider.interface";
import { MockEmailProvider } from "./providers/mock-email.provider";

// Sprint 5.10 — dev/test inspection endpoint. Only meaningful (and only
// returns data) when the mock provider is active — real providers don't
// expose a "list what I sent" API this way.
@ApiTags("email")
@Controller({ path: "email", version: "1" })
export class EmailController {
  constructor(@Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider) {}

  @Roles("admin")
  @Get("sent")
  getSentEmails() {
    if (this.provider instanceof MockEmailProvider) {
      return this.provider.getSentEmails();
    }
    return { message: "Sent-email inspection is only available with the mock email provider." };
  }
}
