import { CircuitBreaker, CircuitOpenError } from "../circuit-breaker";

describe("CircuitBreaker", () => {
  it("stays closed while calls succeed", async () => {
    const breaker = new CircuitBreaker("test-provider", { failureThreshold: 3, resetTimeoutMs: 1000 });
    await breaker.execute(() => Promise.resolve("ok"));
    expect(breaker.getState()).toBe("closed");
  });

  it("opens after consecutive failures reach the threshold", async () => {
    const breaker = new CircuitBreaker("test-provider", { failureThreshold: 2, resetTimeoutMs: 1000 });
    await expect(breaker.execute(() => Promise.reject(new Error("fail")))).rejects.toThrow();
    await expect(breaker.execute(() => Promise.reject(new Error("fail")))).rejects.toThrow();
    expect(breaker.getState()).toBe("open");
  });

  it("fails fast with CircuitOpenError once open, without calling fn", async () => {
    const breaker = new CircuitBreaker("test-provider", { failureThreshold: 1, resetTimeoutMs: 100_000 });
    await expect(breaker.execute(() => Promise.reject(new Error("fail")))).rejects.toThrow();
    const fn = jest.fn().mockResolvedValue("should not run");
    await expect(breaker.execute(fn)).rejects.toThrow(CircuitOpenError);
    expect(fn).not.toHaveBeenCalled();
  });

  it("resets to closed after a success following a failure", async () => {
    const breaker = new CircuitBreaker("test-provider", { failureThreshold: 3, resetTimeoutMs: 1000 });
    await expect(breaker.execute(() => Promise.reject(new Error("fail")))).rejects.toThrow();
    await breaker.execute(() => Promise.resolve("ok"));
    expect(breaker.getState()).toBe("closed");
  });
});
