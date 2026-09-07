import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import helmet from "helmet";
import compression from "compression";
import { AppModule } from "./app.module";

// Sprint 3.1/3.2/3.6/3.7/3.10 — application bootstrap: everything that
// must be wired before the app accepts traffic.
async function bootstrap() {
  // Sprint 5.7 — `rawBody: true` populates `request.rawBody` (a Buffer)
  // on every request, in addition to the normally-parsed `request.body`
  // — needed because webhook signature verification (Sprint 5.2/5.3's
  // `verifyWebhookSignature`) must run over the exact bytes the
  // provider sent, not a re-serialized copy of the parsed JSON, which
  // can differ byte-for-byte even with identical field values.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  const config = app.get(ConfigService);

  app.useLogger(app.get(Logger)); // Sprint 3.2 — structured logging (pino)

  // Sprint 3.7 — Security headers (Phase 8 §7: CSP, X-Content-Type-Options, X-Frame-Options, HSTS)
  app.use(helmet());
  // Sprint 3.11 — Performance: response compression
  app.use(compression());
  // Sprint 3.7 — Security: explicit CORS allowlist, never a wildcard
  app.enableCors({ origin: config.get<string[]>("cors.origin"), credentials: true });

  // Sprint 3.6 — API Foundation: every endpoint is versioned from day
  // one (Phase 8 §5) — no unversioned route is ever exposed.
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  // Sprint 3.6/3.7 — global input validation (Phase 8 §7: "server-side
  // validation on every input, never relying on client-side validation
  // alone"). whitelist strips unknown properties; forbidNonWhitelisted
  // rejects requests that send them, rather than silently dropping.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Sprint 3.2 — graceful shutdown: closes DB pool / Redis connections
  // cleanly on SIGTERM/SIGINT rather than dropping in-flight requests.
  app.enableShutdownHooks();

  // Sprint 3.10 — API Documentation (OpenAPI/Swagger)
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Hue Muse Beauty API")
    .setDescription("Backend Foundation & Core Services — Sprint 3")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = config.get<number>("port") ?? 4000;
  await app.listen(port);
}

bootstrap();
