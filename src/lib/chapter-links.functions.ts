import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getRequestIP, setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CHAPTER_LINK_UNIT_RE, encryptChapterToken, decryptChapterToken } from "./chapter-link";
import { hashToken, newLinkToken } from "./link-token";

function chapterInput(input: { chapter: string }) {
  if (!CHAPTER_LINK_UNIT_RE.test(input?.chapter ?? "")) throw new Error("Chi hội không hợp lệ.");
  return { chapter: input.chapter };
}

export const listChapterLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { data: admin, error: permissionError } = await context.supabase.rpc("is_admin");
    if (permissionError || !admin) throw new Error("Chỉ quản trị Văn phòng được quản lý liên kết Sổ.");
    const { data, error } = await context.supabase.from("chapter_private_links").select("id,chapter_id,active,created_at,revoked_at").order("created_at", { ascending: false });
    if (error) throw new Error("Không đọc được trạng thái liên kết.");
    return data;
  });

/** Issue is idempotent per chapter; copy only decrypts the current link after a fresh admin check. */
export const manageChapterLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { chapter: string; action: "issue" | "copy" | "rotate" | "revoke" }) => {
    const chapter = chapterInput(input).chapter;
    if (!["issue", "copy", "rotate", "revoke"].includes(input.action)) throw new Error("Yêu cầu không hợp lệ.");
    return { chapter, action: input.action };
  })
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { data: admin, error: permissionError } = await context.supabase.rpc("is_admin");
    if (permissionError || !admin) throw new Error("Chỉ quản trị Văn phòng được quản lý liên kết Sổ.");
    const secret = process.env["CHAPTER_LINK_ENCRYPTION_KEY"];
    if (!secret) throw new Error("Chưa cấu hình bảo vệ liên kết Sổ.");
    if (data.action !== "copy") {
      const token = newLinkToken();
      const { error } = await context.supabase.rpc("manage_chapter_private_link", {
        p_chapter: data.chapter, p_action: data.action,
        p_hash: await hashToken(token), p_cipher: await encryptChapterToken(token, data.chapter, secret),
      });
      if (error) throw new Error("Không cập nhật được liên kết Sổ. Vui lòng thử lại.");
    }
    if (data.action === "revoke") return { token: null };
    const { data: cipher, error } = await context.supabase.rpc("chapter_private_link_cipher", { p_chapter: data.chapter });
    if (error || !cipher) throw new Error("Chi hội chưa có liên kết đang hoạt động.");
    return { token: await decryptChapterToken(cipher, data.chapter, secret) };
  });

/** Public exchange: secret hash + chapter binding, IP throttling, independent normal auth sessions. */
export const openChapterLink = createServerFn({ method: "POST" })
  .inputValidator((input: { chapter: string; tokenHash: string }) => {
    const chapter = chapterInput(input).chapter;
    if (!/^[0-9a-f]{64}$/.test(input?.tokenHash ?? "")) throw new Error("Liên kết không hợp lệ.");
    return { chapter, tokenHash: input.tokenHash };
  })
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ipHash = await hashToken("chapter-ip:" + (getRequestIP({ xForwardedFor: true }) ?? "unknown"));
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const attempts = await supabaseAdmin.from("link_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).eq("ok", false).gte("created_at", since);
    if (attempts.error || (attempts.count ?? 0) >= 10) throw new Error("Thử quá nhiều lần hoặc hệ thống tạm lỗi. Vui lòng thử lại sau 15 phút.");
    const lookup = await supabaseAdmin.rpc("chapter_private_link_lookup_service", { p_chapter: data.chapter, p_hash: data.tokenHash });
    const email = !lookup.error ? lookup.data?.[0]?.identity_email : undefined;
    const record = await supabaseAdmin.from("link_attempts").insert({ ip_hash: ipHash, ok: Boolean(email) });
    if (record.error || !email) throw new Error("Liên kết không hợp lệ hoặc đã bị thu hồi. Liên hệ Văn phòng.");
    const created = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true });
    if (created.error && !/already|registered|exists/i.test(created.error.message)) throw new Error("Không mở được Sổ, vui lòng thử lại.");
    const generated = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    const hash = generated.data?.properties?.hashed_token;
    if (generated.error || !hash) throw new Error("Không mở được Sổ, vui lòng thử lại.");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const url = process.env["SUPABASE_URL"];
    if (!key || !url) throw new Error("Không mở được Sổ, vui lòng thử lại.");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    const verified = await client.auth.verifyOtp({ type: "magiclink", token_hash: hash });
    const session = verified.data.session;
    if (verified.error || !session) throw new Error("Không mở được Sổ, vui lòng thử lại.");
    const recheck = await supabaseAdmin.rpc("chapter_private_link_lookup_service", { p_chapter: data.chapter, p_hash: data.tokenHash });
    if (recheck.error || recheck.data?.[0]?.identity_email !== email) throw new Error("Liên kết đã bị thu hồi.");
    return { access_token: session.access_token, refresh_token: session.refresh_token };
  });