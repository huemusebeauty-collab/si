import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

// Sprint 3.6 — API Foundation / Phase 16 §16.16: "Every successful
// response follows the same envelope shape (data, meta, pagination
// where applicable) across every module."
export interface ResponseEnvelope<T> {
  data: T;
  meta: { timestamp: string };
}

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, ResponseEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseEnvelope<T>> {
    return next.handle().pipe(
      map((data) => ({
        data,
        meta: { timestamp: new Date().toISOString() },
      })),
    );
  }
}
