// SIMULATION (not real devices): 42 chapters x 2 devices = 84 fake push endpoints.
import { describe, expect, it } from "vitest";
import { MAX_ATTEMPTS, processOutbox, type Deps, type OutboxItem, type Sub } from "@/lib/push-processor";

function world(opts: { revoked?: string[]; failing?: (s: Sub, call: number) => number } = {}) {
  const emails = Array.from({ length: 42 }, (_, i) => `chi-hoi-${i + 1}@test.invalid`);
  const subs: Sub[] = emails.flatMap((e, i) => [0, 1].map((d) => ({ id: `s${i}-${d}`, email: e, endpoint: `https://push.test/${i}/${d}`, p256dh: "k", auth: "a" })));
  const items = new Map<string, OutboxItem & { status: string; next?: string }>();
  emails.forEach((e, i) => items.set(`o${i}`, { id: `o${i}`, recipient_email: e, kind: "document", title: "Văn bản mới", body: "x", url: "/app", attempts: 0, status: "pending" }));
  items.set("ox", { id: "ox", recipient_email: "outsider@test.invalid", kind: "document", title: "t", body: "b", url: "/app", attempts: 0, status: "pending" });
  const sent: { sub: string; payload: unknown }[] = [];
  const subState = new Map<string, { gone: boolean }>();
  let calls = 0;
  const deps: Deps = {
    now: () => 0,
    loadPending: async (n) => [...items.values()].filter((i) => i.status === "pending").slice(0, n),
    allowedEmails: async (es) => new Set(es.filter((e) => emails.includes(e) && !opts.revoked?.includes(e))),
    subsFor: async (es) => subs.filter((s) => es.includes(s.email) && !subState.get(s.id)?.gone),
    send: async (s, payload) => { calls++; sent.push({ sub: s.id, payload }); return { status: opts.failing ? opts.failing(s, calls) : 201 }; },
    markItem: async (id, p) => { const it = items.get(id)!; Object.assign(it, { status: p.status, attempts: p.attempts, next: p.next_attempt_at }); },
    markSub: async (id, p) => { subState.set(id, { gone: p.gone }); },
  };
  return { deps, items, sent, subs };
}

describe("push outbox (simulated 84 devices)", () => {
  it("delivers each chapter notification to exactly its own 2 devices", async () => {
    const w = world();
    const s = await processOutbox(w.deps);
    expect(s.deliveries).toBe(84);
    expect(w.sent).toHaveLength(84);
    for (let i = 0; i < 42; i++) expect(w.sent.filter((x) => x.sub.startsWith(`s${i}-`))).toHaveLength(2);
    expect(w.items.get("ox")!.status).toBe("skipped"); // outsider never receives
  });

  it("skips recipients whose access was revoked, without sending", async () => {
    const w = world({ revoked: ["chi-hoi-1@test.invalid"] });
    await processOutbox(w.deps);
    expect(w.items.get("o0")!.status).toBe("skipped");
    expect(w.sent.some((x) => x.sub.startsWith("s0-"))).toBe(false);
  });

  it("disables gone (410) subscriptions and still succeeds on the other device", async () => {
    const w = world({ failing: (s) => (s.id.endsWith("-0") ? 410 : 201) });
    const s = await processOutbox(w.deps);
    expect(s.goneSubs).toBe(42);
    expect(w.items.get("o5")!.status).toBe("sent");
  });

  it("retries transient errors with backoff and stops after max attempts", async () => {
    const w = world({ failing: () => 503 });
    await processOutbox(w.deps);
    expect(w.items.get("o0")!.status).toBe("pending");
    expect(w.items.get("o0")!.next).toBeDefined();
    for (let i = 1; i < MAX_ATTEMPTS; i++) await processOutbox(w.deps);
    expect(w.items.get("o0")!.status).toBe("failed");
  });

  it("does not resend already delivered items (idempotent rerun)", async () => {
    const w = world();
    await processOutbox(w.deps);
    const again = await processOutbox(w.deps);
    expect(again.items).toBe(0);
    expect(w.sent).toHaveLength(84);
  });

  it("payload carries no record content", async () => {
    const w = world();
    await processOutbox(w.deps);
    expect(Object.keys(w.sent[0]!.payload as object).sort()).toEqual(["body", "tag", "title", "url"]);
  });
});
