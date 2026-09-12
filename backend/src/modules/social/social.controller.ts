import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";

@ApiTags("social")
@ApiBearerAuth()
@Controller({ path: "social", version: "1" })
export class SocialController {
  @Get("dashboard")
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      creator: {
        status: "ready",
        connectedAccounts: [],
      },
      metrics: {
        posts: 0,
        followers: 0,
        engagement: 0,
      },
    };
  }
}
