import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from "@nestjs/common";
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
      map((data) => {
        // StreamableFile must reach Nest's response adapter directly.
        // Wrapping it in the JSON envelope converts binary media into an
        // object response and causes browser image/video rendering failures.
        if (data instanceof StreamableFile) {
          return data as unknown as ResponseEnvelope<T>;
        }

        return {
          data,
          meta: { timestamp: new Date().toISOString() },
        };
      }),
    );
  }
}
