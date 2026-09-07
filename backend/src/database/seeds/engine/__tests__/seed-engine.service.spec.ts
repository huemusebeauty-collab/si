import { SeedEngineService } from "../seed-engine.service";
import type { SeedProvider, SeedProviderResult, SeedEntityOutcome } from "../seed-provider.interface";

// Sprint 7.4.10 — tests the ENGINE's orchestration logic in isolation
// via mocked providers (no database, no real seed data) — dependency
// ordering, dry-run, duplicate execution (idempotency at the engine
// level — a provider reporting "skipped-unchanged" on a second run),
// validation-failure handling, and rollback behavior. This is the
// correct scope for these tests: whether SETTINGS actually seeds
// correctly is a provider-level concern (and untestable without a live
// DB, same as every other sprint's DB-touching code); whether the
// ENGINE calls providers in the right order and reacts correctly to
// their results is fully testable without one.
function createMockProvider(name: string, dependsOn: string[], outcomes: SeedEntityOutcome[], options?: { throwOnRun?: boolean }): SeedProvider {
  const rollbackCalls: SeedEntityOutcome[][] = [];
  return {
    name,
    dependsOn,
    run: jest.fn(async (): Promise<SeedProviderResult> => {
      if (options?.throwOnRun) throw new Error(`${name} failed intentionally`);
      return { providerName: name, outcomes, durationMs: 1 };
    }),
    rollback: jest.fn(async (outcomesToRollback: SeedEntityOutcome[]) => {
      rollbackCalls.push(outcomesToRollback);
    }),
  };
}

describe("SeedEngineService", () => {
  let engine: SeedEngineService;

  beforeEach(() => {
    engine = new SeedEngineService();
  });

  it("rejects registering the same provider name twice", () => {
    engine.register(createMockProvider("a", [], []));
    expect(() => engine.register(createMockProvider("a", [], []))).toThrow();
  });

  it("executes providers in dependency order, not registration order", async () => {
    const callOrder: string[] = [];
    const c = createMockProvider("c", ["b"], []);
    const b = createMockProvider("b", ["a"], []);
    const a = createMockProvider("a", [], []);
    for (const p of [c, b, a]) {
      const originalRun = p.run;
      p.run = jest.fn(async () => {
        callOrder.push(p.name);
        return originalRun(false);
      });
    }
    // Sprint 7.4.5 — registered in the "wrong" order (c, b, a) —
    // execution order must still resolve to a, b, c per dependsOn.
    engine.register(c);
    engine.register(b);
    engine.register(a);

    await engine.execute();
    expect(callOrder).toEqual(["a", "b", "c"]);
  });

  it("throws a clear error for a circular dependency", async () => {
    engine.register(createMockProvider("a", ["b"], []));
    engine.register(createMockProvider("b", ["a"], []));
    await expect(engine.execute()).rejects.toThrow(/circular/i);
  });

  it("throws a clear error when a provider depends on an unregistered provider", async () => {
    engine.register(createMockProvider("a", ["ghost"], []));
    await expect(engine.execute()).rejects.toThrow(/unregistered/i);
  });

  it("supports dry-run mode — providers receive dryRun: true", async () => {
    const provider = createMockProvider("a", [], []);
    engine.register(provider);
    await engine.execute(true);
    expect(provider.run).toHaveBeenCalledWith(true);
  });

  it("produces an accurate execution summary with totals across providers", async () => {
    engine.register(createMockProvider("a", [], [
      { naturalKey: "x1", action: "created" },
      { naturalKey: "x2", action: "updated" },
    ]));
    engine.register(createMockProvider("b", ["a"], [
      { naturalKey: "y1", action: "skipped-unchanged" },
      { naturalKey: "y2", action: "rejected-invalid" },
    ]));

    const summary = await engine.execute();
    expect(summary.totals).toEqual({ created: 1, updated: 1, skippedUnchanged: 1, rejectedInvalid: 1 });
    expect(summary.fatalError).toBeUndefined();
    expect(summary.rolledBack).toBe(false);
  });

  it("rolls back already-completed providers in reverse order on a fatal failure", async () => {
    const rollbackOrder: string[] = [];
    const a = createMockProvider("a", [], [{ naturalKey: "x", action: "created", entityId: "id-a" }]);
    const b = createMockProvider("b", ["a"], [{ naturalKey: "y", action: "created", entityId: "id-b" }]);
    const c = createMockProvider("c", ["b"], [], { throwOnRun: true });
    for (const p of [a, b]) {
      const originalRollback = p.rollback;
      p.rollback = jest.fn(async (outcomes) => {
        rollbackOrder.push(p.name);
        return originalRollback(outcomes);
      });
    }
    engine.register(a);
    engine.register(b);
    engine.register(c);

    const summary = await engine.execute(false);
    expect(summary.fatalError).toContain("c");
    expect(summary.rolledBack).toBe(true);
    expect(rollbackOrder).toEqual(["b", "a"]); // reverse of completion order
    expect(c.rollback).not.toHaveBeenCalled(); // c itself never completed a run to roll back
  });

  it("does NOT roll back on a fatal failure during a dry-run", async () => {
    const a = createMockProvider("a", [], [{ naturalKey: "x", action: "created" }]);
    const b = createMockProvider("b", ["a"], [], { throwOnRun: true });
    engine.register(a);
    engine.register(b);

    const summary = await engine.execute(true);
    expect(summary.rolledBack).toBe(false);
    expect(a.rollback).not.toHaveBeenCalled();
  });

  it("continues to completion when no provider throws, even with rejected-invalid outcomes mixed in", async () => {
    engine.register(createMockProvider("a", [], [
      { naturalKey: "ok", action: "created" },
      { naturalKey: "bad", action: "rejected-invalid" },
    ]));
    const summary = await engine.execute();
    expect(summary.fatalError).toBeUndefined();
    expect(summary.totals.rejectedInvalid).toBe(1);
    expect(summary.totals.created).toBe(1);
  });

  it("running execute() twice against a stateful provider reflects idempotency (2nd run reports skipped-unchanged, not a duplicate 'created')", async () => {
    // Sprint 7.4.10 — "Duplicate execution": simulates what every real
    // provider does (see providers/*.provider.ts) — the FIRST call to
    // run() creates an entity; a SECOND call against the same
    // (in-memory, for this test) state finds it already exists and
    // reports "skipped-unchanged" rather than creating a duplicate.
    // This is exactly the engine-level contract every provider must
    // honor; the providers' own DB-touching upsert logic is untestable
    // here (same DB-access limitation as every other sprint) but their
    // OBSERVABLE CONTRACT — never a second "created" for the same
    // natural key — is what this test locks in at the engine's level.
    let alreadyCreated = false;
    const provider: SeedProvider = {
      name: "a",
      dependsOn: [],
      run: jest.fn(async () => {
        const outcome: SeedEntityOutcome = alreadyCreated
          ? { naturalKey: "x", action: "skipped-unchanged" }
          : { naturalKey: "x", action: "created", entityId: "id-x" };
        alreadyCreated = true;
        return { providerName: "a", outcomes: [outcome], durationMs: 1 };
      }),
      rollback: jest.fn(),
    };
    engine.register(provider);

    const firstRun = await engine.execute();
    expect(firstRun.totals).toEqual({ created: 1, updated: 0, skippedUnchanged: 0, rejectedInvalid: 0 });

    const secondRun = await engine.execute();
    expect(secondRun.totals).toEqual({ created: 0, updated: 0, skippedUnchanged: 1, rejectedInvalid: 0 });
  });
});
