// Sprint 5.8 — Background Jobs: queue names, one per job category.
// Kept as named constants so a typo in a queue name is a compile error,
// not a silently-orphaned queue.
export const QUEUE_NAMES = {
  EMAIL: "email",
  SMS: "sms",
  WEBHOOK_RETRY: "webhook-retry",
  MEDIA_PROCESSING: "media-processing",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
