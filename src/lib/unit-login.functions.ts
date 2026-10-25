import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CODE_LOGIN_DOMAIN, PIN_RE, UNIT_RE, newPin } from "./units";

const GENERIC = "Mã truy cập không đúng hoặc đơn vị chưa được cấp mã.";

/** Public: exchange unit + access code for a normal session. Lockout is enforced in the DB. */
export const unitLogin = createServerFn({ method: "POST" })
  .inputValidator((i: { unit: string; pin: string }) => ({ unit: String(i?.unit ?? ""), pin: String(i?.pin ?? "").replace(/\s/g, "") }))
  .handler(async ({ data }) => {
    if (!UNIT_RE.test(data.unit) || !PIN_RE.test(data.pin)) return { ok: false as const, message: GENERIC };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: email, error } = await supabaseAdmin.rpc("unit_login_check", { _unit: data.unit, _pin: data.pin });
    if (error) return { ok: false as const, message: "Hệ thống tạm lỗi, vui lòng thử lại." };
    if (email === "LOCKED") return { ok: false as const, message: "Nhập sai quá 5 lần. Vui lòng chờ 15 phút rồi thử lại, hoặc liên hệ Văn phòng." };
    if (!email) { await new Promise((r) => setTimeout(r, 400)); return { ok: false as const, message: GENERIC }; }
    const link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: email as string });
    const hash = link.data?.properties?.hashed_token;
    if (link.error || !hash) return { ok: false as const, message: "Không tạo được phiên đăng nhập, vui lòng thử lại." };
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const pub = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      } },
    });
    const v = await pub.auth.verifyOtp({ token_hash: hash, type: "magiclink" });
    if (v.error || !v.data.session) return { ok: false as const, message: "Không tạo được phiên đăng nhập, vui lòng thử lại." };
    return { ok: true as const, access_token: v.data.session.access_token, refresh_token: v.data.session.refresh_token };
  });

async function requireAdmin(sb: { rpc: (n: "is_admin") => PromiseLike<{ data: unknown }> }) {
  const { data } = await sb.rpc("is_admin");
  if (data !== true) throw new Error("Chỉ quản trị viên được cấp/đổi/thu hồi mã truy cập.");
}

/** Admin: issue a new code (old code + all old sessions stop working). Returns the code ONCE. */
export const rotateUnitCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { unit: string }) => ({ unit: String(i?.unit ?? "") }))
  .handler(async ({ data, context }) => {
    if (!UNIT_RE.test(data.unit)) throw new Error("Đơn vị không hợp lệ.");
    await requireAdmin(context.supabase as never);
    const actor = String((context.claims as { email?: string }).email ?? "admin").toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rand = crypto.getRandomValues(new Uint32Array(2)).reduce((s, n) => s + n.toString(36), "").slice(0, 10);
    const email = `${data.unit}-v${Date.now().toString(36)}-${rand}@${CODE_LOGIN_DOMAIN}`;
    const created = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true, app_metadata: { code_login: data.unit } });
    if (created.error) throw new Error("Không tạo được mã mới, vui lòng thử lại.");
    const pin = newPin();
    const { data: old, error } = await supabaseAdmin.rpc("unit_login_rotate", { _unit: data.unit, _pin: pin, _email: email, _actor: actor });
    if (error) { await supabaseAdmin.auth.admin.deleteUser(created.data.user.id); throw new Error("Không lưu được mã mới."); }
    await removeOld(supabaseAdmin, old as string | null);
    return { pin };
  });

/** Admin: revoke the unit's code entirely (all devices signed out on next request). */
export const revokeUnitCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { unit: string }) => ({ unit: String(i?.unit ?? "") }))
  .handler(async ({ data, context }) => {
    if (!UNIT_RE.test(data.unit)) throw new Error("Đơn vị không hợp lệ.");
    await requireAdmin(context.supabase as never);
    const actor = String((context.claims as { email?: string }).email ?? "admin").toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: old, error } = await supabaseAdmin.rpc("unit_login_rotate", { _unit: data.unit, _pin: null as never, _email: null as never, _actor: actor });
    if (error) throw new Error("Không thu hồi được mã.");
    await removeOld(supabaseAdmin, old as string | null);
    return { ok: true };
  });

// Delete the old synthetic account so its refresh tokens die; its permission rows are already inactive.
async function removeOld(admin: { auth: { admin: { listUsers: (o: object) => Promise<{ data: { users: { id: string; email?: string }[] } }>; deleteUser: (id: string) => Promise<unknown> } } }, old: string | null) {
  if (!old) return;
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const u = data.users.find((x) => x.email === old);
    if (u) { await admin.auth.admin.deleteUser(u.id); return; }
    if (data.users.length < 200) return;
  }
}
