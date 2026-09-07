import { HttpException, HttpStatus } from "@nestjs/common";

// Sprint 4.10 — Validation Rules: domain exceptions carry a specific,
// stable business error code (e.g. INSUFFICIENT_STOCK) distinct from the
// generic HTTP-status-derived code Sprint 3's GlobalExceptionFilter used
// (e.g. "BAD_REQUEST"). GlobalExceptionFilter prefers this code when
// present (see the filter's update below) — so frontend/HMEOS error
// handling can branch on stable business codes, not HTTP status alone,
// per Phase 16 §16.16's "consistent error shape" combined with the
// domain-validation needs this sprint introduces.
export class DomainException extends HttpException {
  public readonly errorCode: string;

  constructor(errorCode: string, message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ message, errorCode }, status);
    this.errorCode = errorCode;
  }
}

// Sprint 4.10 — the fixed vocabulary of business error codes introduced
// this sprint. Kept as a single enum so the same string is never
// hand-typed twice (a common source of silent code drift).
export enum DomainErrorCode {
  INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK",
  INVALID_QUANTITY = "INVALID_QUANTITY",
  PRODUCT_NOT_ACTIVE = "PRODUCT_NOT_ACTIVE",
  CANNOT_ACTIVATE_WITHOUT_VARIANT = "CANNOT_ACTIVATE_WITHOUT_VARIANT",
  DUPLICATE_WISHLIST_ITEM = "DUPLICATE_WISHLIST_ITEM",
  CART_EMPTY = "CART_EMPTY",
  ORDER_NOT_CANCELLABLE = "ORDER_NOT_CANCELLABLE",
  ORDER_NOT_RETURNABLE = "ORDER_NOT_RETURNABLE",
  RETURN_WINDOW_EXPIRED = "RETURN_WINDOW_EXPIRED",
  INVALID_STATUS_TRANSITION = "INVALID_STATUS_TRANSITION",
  REVIEW_NOT_PENDING = "REVIEW_NOT_PENDING",
  STALE_WRITE_CONFLICT = "STALE_WRITE_CONFLICT",
  INVALID_ADDRESS = "INVALID_ADDRESS",
  REAUTHENTICATION_REQUIRED = "REAUTHENTICATION_REQUIRED",
  RATE_LIMITED = "RATE_LIMITED",
}
