/** Isolated authorized TEST administrator; never mint/claim real owner or recipient links. */
import { createClient } from "@supabase/supabase-js";
import { encryptChapterToken } from "../../src/lib/chapter-link";
import { hashToken, newLinkToken } from "../../src/lib/link-token";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const url = process.env["SUPABASE_URL"];
const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
const service = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const encryption = process.env["CHAPTER_LINK_ENCRYPTION_KEY"];
if (!url || !key || !service || !encryption) throw new Error("Missing test configuration");
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const root = createClient(url, service, opts);
const statePath = "/tmp/browser/chapter-links/private-fixture.json";
const phase = process.argv[2] ?? "setup";
let passed = 0;
function check(label: string, ok: boolean) { if (!ok) throw new Error(label); passed++; console.log("PASS " + label); }
async function signIn(email: string) {
  const g = await root.auth.admin.generateLink({ type: "magiclink", email });
  if (g.error) throw new Error("Cannot authenticate TEST identity");
  const client = createClient(url, key, opts);
  const result = await client.auth.verifyOtp({ type: "magiclink", token_hash: g.data.properties.hashed_token });
  if (result.error || !result.data.session) throw new Error("Cannot create TEST session");
  return { client, session: result.data.session };
}
if (phase === "setup") {
  const active = await root.from("chapter_private_links").select("id").in("chapter_id", ["ch01", "ch02"]).eq("active", true);
  if (active.error || active.data.length) throw new Error("Refusing to alter an existing active chapter link");
  const run = Date.now().toString(36);
  const email = `test+${run}-chapter-links-admin@hoi-test.invalid`;
  const created = await root.auth.admin.createUser({ email, email_confirm: true });
  if (created.error || !created.data.user) throw new Error("Cannot create TEST administrator");
  const grant = await root.from("app_users").insert({ email, office_role: "admin", note: `[TEST ${run}] chapter links` });
  if (grant.error) throw new Error("Cannot configure TEST administrator");
  const admin = await signIn(email);
  const links = [];
  for (const chapter of ["ch01", "ch02"]) {
    const token = newLinkToken();
    const hash = await hashToken(token);
    const cipher = await encryptChapterToken(token, chapter, encryption);
    const issued = await admin.client.rpc("manage_chapter_private_link", { p_chapter: chapter, p_action: "issue", p_hash: hash, p_cipher: cipher });
    check(`authorized TEST issue ${chapter}`, !issued.error && Boolean(issued.data));
    const repeated = await admin.client.rpc("manage_chapter_private_link", { p_chapter: chapter, p_action: "issue", p_hash: await hashToken(newLinkToken()), p_cipher: cipher });
    check(`issue preserves existing link ${chapter}`, repeated.data === issued.data);
    const lookup = await root.rpc("chapter_private_link_lookup_service", { p_chapter: chapter, p_hash: hash });
    const identity = lookup.data?.[0]?.identity_email;
    if (!identity) throw new Error("TEST link lookup failed");
    links.push({ chapter, token, id: issued.data, identity });
  }
  await mkdir("/tmp/browser/chapter-links", { recursive: true });
  await writeFile(statePath, JSON.stringify({ run, email, userId: created.data.user.id, session: admin.session, storageKey: `sb-${new URL(url).hostname.split(".")[0]}-auth-token`, links }), { mode: 0o600 });
  const first = links[0];
  if (!first) throw new Error("Fixture missing");
  const a = await signIn(first.identity);
  const b = await signIn(first.identity);
  check("two independent authenticated sessions", a.session.access_token !== b.session.access_token);
  const access = await a.client.rpc("my_access");
  const permissions = access.data as { chapters?: string[]; office?: boolean };
  check("chapter link limited to ch01", permissions.chapters?.length === 1 && permissions.chapters[0] === "ch01" && !permissions.office);
  check("cross-unit denied", (await a.client.rpc("can_chapter", { _ch: "ch02" })).data === false);
  check("chapter cannot issue links", Boolean((await a.client.rpc("manage_chapter_private_link", { p_chapter: "ch02", p_action: "revoke" })).error));
  check("chapter cannot read encrypted secrets", Boolean((await a.client.from("chapter_private_links").select("token_cipher")).error));
  check("chapter cannot invoke privileged lookup", Boolean((await a.client.rpc("chapter_private_link_lookup_service", { p_chapter: "ch01", p_hash: await hashToken(first.token) })).error));
  check("wrong unit binding rejects link", (await root.rpc("chapter_private_link_lookup_service", { p_chapter: "ch02", p_hash: await hashToken(first.token) })).data?.length === 0);
  check("invalid link rejects", (await root.rpc("chapter_private_link_lookup_service", { p_chapter: "ch01", p_hash: "0".repeat(64) })).data?.length === 0);
  console.log(`${passed} live assertions passed; TEST fixtures retained solely for browser acceptance.`);
} else if (phase === "cleanup") {
  const state = JSON.parse(await readFile(statePath, "utf8"));
  const createdLinks = await root.from("chapter_private_links").select("id,identity_email").eq("created_by", state.email);
  const emails = [state.email, ...(createdLinks.data ?? []).map((l) => l.identity_email)];
  const submissions = await root.from("submissions").select("id").in("created_by", emails);
  const ids = (submissions.data ?? []).map((s) => s.id);
  if (ids.length) {
    const files = await root.from("attachments").select("path").in("owner_id", ids);
    if (files.data?.length) await root.storage.from("evidence").remove(files.data.map((f) => f.path));
    await root.from("attachments").delete().in("owner_id", ids);
    await root.from("submission_feedback").delete().in("submission_id", ids);
    await root.from("submissions").delete().in("id", ids);
  }
  await root.from("chapter_access").delete().in("email", emails);
  await root.from("chapter_private_links").delete().eq("created_by", state.email);
  await root.from("notification_outbox").delete().in("recipient_email", emails);
  await root.from("app_users").delete().in("email", emails);
  for (let page = 1; page <= 20; page++) {
    const users = await root.auth.admin.listUsers({ page, perPage: 200 });
    for (const user of users.data.users) if (user.email && emails.includes(user.email)) await root.auth.admin.deleteUser(user.id);
    if (users.data.users.length < 200) break;
  }
  console.log("Removed only this run's TEST links, identities, reports and files; audit retained.");
}