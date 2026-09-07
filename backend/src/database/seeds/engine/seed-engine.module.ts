import { Module } from "@nestjs/common";
import { SeedEngineService } from "./seed-engine.service";
import { SeedVerificationService } from "./seed-verification.service";

@Module({
  providers: [SeedEngineService, SeedVerificationService],
  exports: [SeedEngineService, SeedVerificationService],
})
export class SeedEngineModule {}
