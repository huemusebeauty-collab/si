import { withRetry } from "../with-retry";

describe("withRetry", () => {
  it("returns the result on first success without retrying", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries transient failures up to maxAttempts", async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error("fail 1")).mockRejectedValueOnce(new Error("fail 2")).mockResolvedValueOnce("ok");
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting all attempts", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("always fails"));
    await expect(withRetry(fn, { maxAttempts: 2, baseDelayMs: 1 })).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry when isRetryable returns false", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("permanent failure"));
    await expect(
      withRetry(fn, { maxAttempts: 5, baseDelayMs: 1, isRetryable: () => false }),
    ).rejects.toThrow("permanent failure");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
