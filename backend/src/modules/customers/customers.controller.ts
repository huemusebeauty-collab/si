import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CustomersService } from "./customers.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { AddressDto } from "./dto/address.dto";
import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";

// Sprint 3.5/3.6 — Controllers handle only request parsing, auth checks,
// and response shaping (Phase 16 §16.1) — no business logic here.
@ApiTags("customers")
@ApiBearerAuth()
@Controller({ path: "customers/me", version: "1" })
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.customers.getProfile(user.id);
  }

  @Patch()
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.customers.updateProfile(user.id, dto);
  }

  @Post("addresses")
  addAddress(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddressDto) {
    return this.customers.addAddress(user.id, dto);
  }

  @Patch("addresses/:addressId")
  updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param("addressId") addressId: string,
    @Body() dto: Partial<AddressDto>,
  ) {
    return this.customers.updateAddress(user.id, addressId, dto);
  }

  @Delete("addresses/:addressId")
  removeAddress(@CurrentUser() user: AuthenticatedUser, @Param("addressId") addressId: string) {
    return this.customers.removeAddress(user.id, addressId);
  }

  @Patch("addresses/:addressId/default")
  setDefaultAddress(@CurrentUser() user: AuthenticatedUser, @Param("addressId") addressId: string) {
    return this.customers.setDefaultAddress(user.id, addressId);
  }

  @Patch("preferences")
  updatePreferences(@CurrentUser() user: AuthenticatedUser, @Body() prefs: Record<string, unknown>) {
    return this.customers.updatePreferences(user.id, prefs);
  }

  @Patch("password")
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.customers.changePassword(user.id, body.oldPassword, body.newPassword);
  }
}
