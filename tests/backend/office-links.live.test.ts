/** Real negative authorization tests only; never impersonates or mints the real owner. */
import { createClient } from "@supabase/supabase-js";
const url = process.env['SUPABASE_URL'];
const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
const service = process.env['SUPABASE_SERVICE_ROLE_KEY'];
if (!url || !key || !service) throw new Error("Missing test credentials");
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const root = createClient(url, service, opts);
const anon = createClient(url, key, opts);
const email = `test+${Date.now().toString(36)}-office-link@hoi-test.invalid`;
let id: string | undefined;
let passed = 0;
function check(label: string, ok: boolean) { if (!ok) throw new Error(label); passed++; console.log("PASS " + label); }
try {
  const u = await root.auth.admin.createUser({ email, email_confirm: true });
  if (u.error || !u.data.user) throw new Error("Cannot create test identity");
  id = u.data.user.id;
  const link = await root.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw new Error("Cannot sign test identity in");
  const client = createClient(url, key, opts);
  const login = await client.auth.verifyOtp({ type: "magiclink", token_hash: link.data.properties.hashed_token });
  if (login.error) throw new Error("Test login failed");
  const args = { p_token_hash: "a".repeat(64), p_label: "[TEST] unauthorized" };
  check("anonymous cannot issue office capability", Boolean((await anon.rpc("create_office_daily_link", args)).error));
  check("outsider cannot issue office capability", Boolean((await client.rpc("create_office_daily_link", args)).error));
  check("authenticated cannot call service-only exchange", Boolean((await client.rpc("office_daily_link_lookup_service", { p_token_hash: "a".repeat(64) })).error));
  const grant = await root.from("app_users").insert({ email, office_role: "admin", note: "[TEST] negative office-link permission" });
  if (grant.error) throw new Error("Test role setup failed");
  check("ordinary admin cannot issue owner-only capability", Boolean((await client.rpc("create_office_daily_link", args)).error));
  check("ordinary admin cannot revoke capability", Boolean((await client.rpc("revoke_office_daily_link", { p_id: crypto.randomUUID(), p_reason: "[TEST]" })).error));
  const rows = await client.from("office_daily_links").select("id,label,active");
  check("ordinary admin cannot list owner links", !rows.error && rows.data.length === 0);
  check("hash is not selectable by authenticated users", Boolean((await client.from("office_daily_links").select("token_hash")).error));
  console.log(`${passed} real negative authorization tests passed; positive owner/multi-device flow NOT tested.`);
} finally {
  await root.from("app_users").delete().eq("email", email);
  if (id) await root.auth.admin.deleteUser(id);
}