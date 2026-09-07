import * as bcrypt from "bcrypt";

// Sprint 3.3 — Authentication Foundation. Phase 16 §16.2: "Passwords are
// hashed with a strong, salted algorithm; plaintext is never logged or
// persisted anywhere." bcrypt with cost factor 12 — a deliberate,
// documented choice (not the bcrypt default of 10) balancing brute-force
// resistance against request latency for this workload.
const SALT_ROUNDS = 12;

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
