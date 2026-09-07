import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import type { Request } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { randomUUID } from "crypto";
import { correlationIdStorage } from "@/integrations/common/correlation-id.store";

// Sprint 3.6 / Phase 16 §16.16: "Every request is logged with a request
// ID, module, duration, and outcome." Request ID is generated here if
// the client didn't supply one, and echoed back on the response for
// client-side correlation.
//
// Sprint 5.11 addition: the same request ID is placed into
// AsyncLocalStorage so integration-layer code (payment/shipping/email/
// SMS provider calls, several async hops deeper in the call stack) can
// tag its own log lines with it via `getCurrentCorrelationId()`, without
// threading a correlationId parameter through every intermediate method.
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<Request>();
    const response = httpCtx.getResponse();

    const requestId = (request.headers["x-request-id"] as string) ?? randomUUID();
    request.headers["x-request-id"] = requestId;
    response.setHeader("x-request-id", requestId);

    const moduleName = context.getClass().name;

    return new Observable((subscriber) => {
      correlationIdStorage.run(requestId, () => {
        next
          .handle()
          .pipe(
            tap({
              next: () => {
                this.logger.log(
                  `[${requestId}] ${request.method} ${request.url} (${moduleName}) - ${Date.now() - start}ms - OK`,
                );
              },
              error: (err) => {
                this.logger.warn(
                  `[${requestId}] ${request.method} ${request.url} (${moduleName}) - ${Date.now() - start}ms - ERROR: ${err.message}`,
                );
              },
            }),
          )
          .subscribe(subscriber);
      });
    });
  }
}
