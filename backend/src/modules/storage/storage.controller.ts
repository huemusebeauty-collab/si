import { BadRequestException, Controller, Get, Headers, Param, Post, Query, Req, Res, StreamableFile, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { StorageService, type UploadCategory } from "./storage.service";
import { Roles } from "@/common/decorators/roles.decorator";
import { Public } from "@/common/decorators/public.decorator";

const MEDIA_CATEGORIES: UploadCategory[] = ["product-media", "cms-assets", "review-media"];

function isMediaObjectId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\.[a-z0-9]{1,12})?$/i.test(value);
}

@ApiTags("storage")
@ApiBearerAuth()
@Controller({ path: "storage", version: "1" })
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Roles("admin")
  @ApiConsumes("multipart/form-data")
  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() request: Request) {
    const result = await this.storage.upload(file);
    const [category, id] = result.key.split("/");
    const protocol = String(request.headers["x-forwarded-proto"] ?? request.protocol).split(",")[0].trim();
    const host = request.get("host");
    const type = result.contentType.startsWith("video/") ? "video" : "image";

    if (!category || !id || !host) {
      throw new BadRequestException("Unable to construct media URL.");
    }

    return {
      ...result,
      url: `${protocol}://${host}/v1/storage/media/${encodeURIComponent(category)}/${encodeURIComponent(id)}?type=${type}`,
    };
  }

  @Roles("admin")
  @Get("media/library")
  async listMedia(@Query("category") category: string = "product-media", @Req() request: Request) {
    if (!MEDIA_CATEGORIES.includes(category as UploadCategory)) {
      throw new BadRequestException("Invalid media category.");
    }

    const items = await this.storage.listMedia(category as UploadCategory);
    const protocol = String(request.headers["x-forwarded-proto"] ?? request.protocol).split(",")[0].trim();
    const host = request.get("host");
    if (!host) throw new BadRequestException("Unable to construct media URL.");

    return {
      items: items.map((item) => ({
        ...item,
        url: `${protocol}://${host}/v1/storage/media/${encodeURIComponent(category)}/${encodeURIComponent(item.urlKey)}?type=${item.type}`,
      })),
    };
  }

  @Public()
  @Get("media/:category/:id")
  async readMedia(
    @Param("category") category: string,
    @Param("id") id: string,
    @Query("type") type: string | undefined,
    @Headers("range") range: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    if (!MEDIA_CATEGORIES.includes(category as UploadCategory) || !isMediaObjectId(id)) {
      throw new BadRequestException("Invalid media reference.");
    }

    const object = await this.storage.getObject(`${category}/${id}`, range);
    response.status(object.statusCode);
    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    response.setHeader("Content-Length", String(object.contentLength ?? object.body.length));
    response.setHeader("Content-Disposition", "inline");
    if (type === "video") {
      // Keep byte-range support independent of whether legacy objects have
      // trustworthy Content-Type metadata.
      response.setHeader("Accept-Ranges", "bytes");
      if (object.contentRange) response.setHeader("Content-Range", object.contentRange);
    }

    return new StreamableFile(object.body, {
      type: object.contentType,
      length: object.contentLength,
    });
  }
}
