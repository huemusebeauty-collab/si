// Sprint 5.1 — Integration Architecture: timeout handling. Wraps any
// provider call so a hung external request never blocks a request
// thread indefinitely — every adapter method in this sprint goes
// through this, never a bare `await providerCall()`.
export class IntegrationTimeoutError extends Error {
  constructor(operationName: string, timeoutMs: number) {
    super(`Integration call "${operationName}" timed out after ${timeoutMs}ms.`);
    this.name = "IntegrationTimeoutError";
  }
}

export async function withTimeout<T>(
  operationName: string,
  timeoutMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new IntegrationTimeoutError(operationName, timeoutMs)), timeoutMs);
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
