import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

// Sprint 3.6 — API Foundation / Phase 16 §16.16: "A single consistent
// [error] shape — status code, error code, human-readable message —
// returned by every service ... never a bespoke error format per module."
interface ErrorResponseBody {
  statusCode: number;
  errorCode: string;
  message: string;
  path: string;
  timestamp: string;
  requestId?: string;
  details?: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message = isHttpException
      ? this.extractMessage(exceptionResponse)
      : "An unexpected error occurred.";
    const details =
      isHttpException && typeof exceptionResponse === "object"
        ? (exceptionResponse as Record<string, unknown>).message
        : undefined;

    // Sprint 4.10 — a DomainException's specific business code (e.g.
    // INSUFFICIENT_STOCK) takes precedence over the generic
    // HTTP-status-derived one, so callers can branch on stable business
    // semantics rather than just the status code.
    const domainErrorCode =
      isHttpException && typeof exceptionResponse === "object" && "errorCode" in (exceptionResponse as object)
        ? (exceptionResponse as Record<string, unknown>).errorCode as string
        : undefined;

    const body: ErrorResponseBody = {
      statusCode,
      errorCode: domainErrorCode ?? this.errorCodeFor(statusCode),
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: (request.headers["x-request-id"] as string) ?? undefined,
      details: Array.isArray(details) ? details : undefined,
    };

    // Sprint 3.6 §16.16 — every request logged with request ID, module,
    // duration, outcome (duration/module logged by LoggingInterceptor;
    // this logs the failure outcome specifically).
    this.logger.warn(`${request.method} ${request.url} -> ${statusCode} ${message}`);

    response.status(statusCode).json(body);
  }

  private extractMessage(exceptionResponse: unknown): string {
    if (typeof exceptionResponse === "string") return exceptionResponse;
    if (
      exceptionResponse &&
      typeof exceptionResponse === "object" &&
      "message" in exceptionResponse
    ) {
      const msg = (exceptionResponse as { message: unknown }).message;
      return Array.isArray(msg) ? msg[0] : String(msg);
    }
    return "An error occurred.";
  }

  private errorCodeFor(statusCode: number): string {
    const map: Record<number, string> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      422: "UNPROCESSABLE_ENTITY",
      429: "TOO_MANY_REQUESTS",
      500: "INTERNAL_SERVER_ERROR",
    };
    return map[statusCode] ?? "ERROR";
  }
}
