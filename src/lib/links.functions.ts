import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hashToken, isLinkToken, newLinkToken, normalizeOfficeCode } from "@/lib/link-token";

const FAIL_LIMIT = 10; // failed attempts per IP per 15 minutes

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

/** Shared IP rate limit for the public exchange endpoints. Throws when over the limit; records the attempt. */
async function guardIp(admin: Admin): Promise<(ok: boolean) => Promise<void>> {
  const ipHash = await hashToken("ip:" + (getRequestIP({ xForwardedFor: true }) ?? "unknown"));
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count } = await admin.from("link_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).eq("ok", false).gte("created_at", since);
  if ((count ?? 0) >= FAIL_LIMIT) throw new Error("Thử quá nhiều lần. Vui lòng chờ 15 phút.");
  return (ok) => admin.from("link_attempts").insert({ ip_hash: ipHash, ok }).then(() => {});
}

/** Mints a session for a synthetic identity email (creates the auth user on first use). */
async function sessionFor(admin: Admin, email: string): Promise<string> {
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error && !/already|registered|exists/i.test(created.error.message)) throw new Error("Không mở được, thử lại sau.");
  const { data: gen, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !gen?.properties?.hashed_token) throw new Error("Không mở được, thử lại sau.");
  return gen.properties.hashed_token;
}

/** Public: exchange the office protection code for a session of the shared office identity. Rate-limited per IP. */
export const openOfficeCode = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => ({ code: normalizeOfficeCode(d?.code) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const record = await guardIp(supabaseAdmin);
    const { data: rows } = await supabaseAdmin.rpc("office_code_lookup_service", { p_code_hash: await hashToken(data.code) });
    const email = (rows as { identity_email: string }[] | null)?.[0]?.identity_email;
    await record(!!email);
    if (!email) throw new Error("Mã không đúng hoặc đã bị thu hồi. Liên hệ quản trị để được cấp lại.");
    return { tokenHash: await sessionFor(supabaseAdmin, email) };
  });

/** Admin: issue a one-time handover link (recipient sets the office code themselves). Token shown once. */
export const issueHandover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { label?: string; hours?: number }) => ({ label: String(d?.label ?? "").slice(0, 120), hours: Math.min(Math.max(Math.trunc(d?.hours ?? 72) || 72, 1), 720) }))
  .handler(async ({ data, context }) => {
    const token = newLinkToken();
    const { error } = await context.supabase.rpc("create_handover_invite", { p_token_hash: await hashToken(token), p_label: data.label, p_hours: data.hours });
    if (error) throw new Error(error.message);
    return { token };
  });

/** Public: exchange a one-time handover token for a session of the handover admin identity. Rate-limited per IP. */
export const openHandover = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => {
    if (!isLinkToken(d?.token)) throw new Error("Liên kết tiếp nhận không hợp lệ hoặc đã dùng");
    return { token: d.token };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const record = await guardIp(supabaseAdmin);
    const { data: rows } = await supabaseAdmin.rpc("handover_lookup_service", { p_token_hash: await hashToken(data.token) });
    const email = (rows as { identity_email: string }[] | null)?.[0]?.identity_email;
    await record(!!email);
    if (!email) throw new Error("Liên kết tiếp nhận không hợp lệ, đã dùng hoặc đã hết hạn. Liên hệ người bàn giao để nhận liên kết mới.");
    return { tokenHash: await sessionFor(supabaseAdmin, email) };
  });
