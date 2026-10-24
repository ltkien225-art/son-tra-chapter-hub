/**
 * Runtime-agnostic outbox processor. All IO is injected so the selection,
 * batching, retry and dead-subscription rules can be unit tested.
 */
export type OutboxItem = { id: string; recipient_email: string; kind: string; title: string; body: string; url: string; attempts: number };
export type Sub = { id: string; email: string; endpoint: string; p256dh: string; auth: string };
export type SendResult = { status: number };

export type Deps = {
  loadPending(limit: number): Promise<OutboxItem[]>;
  /** Emails that currently hold any permission (re-checked at send time). */
  allowedEmails(emails: string[]): Promise<Set<string>>;
  subsFor(emails: string[]): Promise<Sub[]>;
  send(sub: Sub, payload: { title: string; body: string; url: string; tag: string }): Promise<SendResult>;
  markItem(id: string, patch: { status: string; attempts: number; next_attempt_at?: string; delivered_devices?: number; last_error?: string | null }): Promise<void>;
  markSub(id: string, patch: { ok: boolean; gone: boolean; error?: string }): Promise<void>;
  now(): number;
};

export const MAX_ATTEMPTS = 5;
export const BATCH = 200;
export const CONCURRENCY = 20;

export const backoffMs = (attempt: number) => Math.min(6 * 3600_000, 60_000 * 2 ** attempt);

export async function processOutbox(deps: Deps, limit = BATCH) {
  const items = await deps.loadPending(limit);
  const stats = { items: items.length, sent: 0, skipped: 0, retry: 0, failed: 0, deliveries: 0, goneSubs: 0 };
  if (!items.length) return stats;
  const emails = [...new Set(items.map((i) => i.recipient_email))];
  const allowed = await deps.allowedEmails(emails);
  const subs = await deps.subsFor(emails.filter((e) => allowed.has(e)));
  const byEmail = new Map<string, Sub[]>();
  for (const s of subs) byEmail.set(s.email, [...(byEmail.get(s.email) ?? []), s]);

  const tasks = items.map((item) => async () => {
    const attempts = item.attempts + 1;
    if (!allowed.has(item.recipient_email)) {
      stats.skipped++;
      return deps.markItem(item.id, { status: "skipped", attempts, last_error: "no_permission" });
    }
    const targets = byEmail.get(item.recipient_email) ?? [];
    if (!targets.length) {
      stats.skipped++;
      return deps.markItem(item.id, { status: "skipped", attempts, last_error: "no_device" });
    }
    let ok = 0, transient = 0;
    for (const s of targets) {
      try {
        const r = await deps.send(s, { title: item.title, body: item.body, url: item.url, tag: item.kind });
        if (r.status >= 200 && r.status < 300) { ok++; await deps.markSub(s.id, { ok: true, gone: false }); }
        else if (r.status === 404 || r.status === 410) { stats.goneSubs++; await deps.markSub(s.id, { ok: false, gone: true, error: String(r.status) }); }
        else { transient++; await deps.markSub(s.id, { ok: false, gone: false, error: String(r.status) }); }
      } catch (e) {
        transient++;
        await deps.markSub(s.id, { ok: false, gone: false, error: (e as Error).message.slice(0, 200) });
      }
    }
    stats.deliveries += ok;
    if (ok > 0 || transient === 0) {
      stats.sent += ok > 0 ? 1 : 0;
      if (ok === 0) stats.skipped++;
      return deps.markItem(item.id, { status: ok > 0 ? "sent" : "skipped", attempts, delivered_devices: ok, last_error: ok > 0 ? null : "all_devices_gone" });
    }
    if (attempts >= MAX_ATTEMPTS) {
      stats.failed++;
      return deps.markItem(item.id, { status: "failed", attempts, last_error: "max_attempts" });
    }
    stats.retry++;
    return deps.markItem(item.id, { status: "pending", attempts, next_attempt_at: new Date(deps.now() + backoffMs(attempts)).toISOString(), last_error: "transient" });
  });

  for (let i = 0; i < tasks.length; i += CONCURRENCY) await Promise.all(tasks.slice(i, i + CONCURRENCY).map((t) => t()));
  return stats;
}
