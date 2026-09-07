import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReviewEntity } from "./entities/review.entity";
import { ReviewReplyEntity } from "./entities/review-reply.entity";
import { ReviewsService } from "./reviews.service";
import { ReviewsController } from "./reviews.controller";
import { SettingsModule } from "@/admin/settings/settings.module";

@Module({
  imports: [TypeOrmModule.forFeature([ReviewEntity, ReviewReplyEntity]), SettingsModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
