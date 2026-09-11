import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HttpModule } from "@nestjs/axios";
import { HealthController, RenderHealthController } from "./health.controller";

// Sprint 3.2 — Core Infrastructure: health check endpoints.
@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController, RenderHealthController],
})
export class HealthModule {}
