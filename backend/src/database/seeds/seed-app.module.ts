import { Module } from "@nestjs/common";
import { AppModule } from "@/app.module";
import { SeedProvidersModule } from "./providers/seed-providers.module";

/**
 * One-off seed application context.
 *
 * AppModule supplies the real database/config/domain infrastructure while
 * SeedProvidersModule supplies the seed engine and its provider graph.
 * Keeping this wiring out of AppModule avoids loading seed providers during
 * normal API startup.
 */
@Module({
  imports: [AppModule, SeedProvidersModule],
})
export class SeedAppModule {}
