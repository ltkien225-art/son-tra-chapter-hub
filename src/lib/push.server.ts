import { buildPushHTTPRequest } from "@pushforge/builder";
import { processOutbox, type Deps } from "./push-processor";

const ADMIN = "ubmttqvnphuongsontra@gmail.com";

/** Server-only: wires the outbox processor to the backend with the service client. */
export async function runPushOutbox(limit = 200) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const jwk = process.env["VAPID_PRIVATE_JWK"];
  if (!jwk) throw new Error("push_not_configured");
  const deps: Deps = {
    now: () => Date.now(),
    async loadPending(n) {
      const { data, error } = await db.from("notification_outbox").select("id,recipient_email,kind,title,body,url,attempts")
        .eq("status", "pending").lte("next_attempt_at", new Date().toISOString()).order("created_at").limit(n);
      if (error) throw error;
      return data ?? [];
    },
    async allowedEmails(emails) {
      const out = new Set<string>(emails.includes(ADMIN) ? [ADMIN] : []);
      if (!emails.length) return out;
      const { data: users } = await db.from("app_users").select("email,office_role").eq("active", true).in("email", emails);
      const { data: ca } = await db.from("chapter_access").select("email,chapter_id").in("email", emails);
      const { data: links, error: linkError } = await db.from("chapter_private_links").select("identity_email,chapter_id").eq("active", true).in("identity_email", emails);
      const activeLinks = new Set((links ?? []).map((l) => `${l.identity_email}:${l.chapter_id}`));
      const withCh = new Set((ca ?? []).filter((c) => !c.email.startsWith("so-link-") || (!linkError && activeLinks.has(`${c.email}:${c.chapter_id}`))).map((x) => x.email));
      for (const u of users ?? []) if (u.email.startsWith("so-link-") ? withCh.has(u.email) : (u.office_role || withCh.has(u.email))) out.add(u.email);
      return out;
    },
    async subsFor(emails) {
      if (!emails.length) return [];
      const { data } = await db.from("push_subscriptions").select("id,email,endpoint,p256dh,auth").eq("disabled", false).in("email", emails);
      return data ?? [];
    },
    async send(sub, payload) {
      const req = await buildPushHTTPRequest({
        privateJWK: jwk,
        subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message: { payload, adminContact: `mailto:${ADMIN}`, options: { ttl: 86400, urgency: "normal", topic: payload.tag.slice(0, 32) } },
      });
      const r = await fetch(req.endpoint, { method: "POST", headers: req.headers, body: req.body });
      return { status: r.status };
    },
    async markItem(id, p) {
      await db.from("notification_outbox").update({ ...p, updated_at: new Date().toISOString() }).eq("id", id);
    },
    async markSub(id, p) {
      if (p.ok) await db.from("push_subscriptions").update({ fail_count: 0, last_ok_at: new Date().toISOString(), last_error: null }).eq("id", id);
      else if (p.gone) await db.from("push_subscriptions").update({ disabled: true, last_error: p.error ?? "gone" }).eq("id", id);
      else {
        const { data } = await db.from("push_subscriptions").select("fail_count").eq("id", id).single();
        const fc = (data?.fail_count ?? 0) + 1;
        await db.from("push_subscriptions").update({ fail_count: fc, disabled: fc >= 10, last_error: p.error ?? "error" }).eq("id", id);
      }
    },
  };
  return processOutbox(deps, limit);
}
