import { Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { StorageService } from "./storage.service";
import { Roles } from "@/common/decorators/roles.decorator";

// Sprint 3.8 — admin media upload endpoint (Phase 16 §16.14: "Admin
// media uploads validated for type/size ... before being made publicly
// accessible").
@ApiTags("storage")
@ApiBearerAuth()
@Controller({ path: "storage", version: "1" })
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Roles("admin")
  @ApiConsumes("multipart/form-data")
  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.storage.upload(file);
  }
}
