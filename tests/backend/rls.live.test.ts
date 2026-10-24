/**
 * Live backend acceptance tests (real Auth JWTs through the real Data API).
 * Run: bun tests/backend/rls.live.test.ts
 * - Creates throw-away users named test+<run>-*@hoi-test.invalid and rows tagged "[TEST <run>]".
 * - At the end it removes ONLY the rows/users created by this run (audit_log is append-only and kept).
 * - Never touches the real admin account or any pre-existing record.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !ANON || !SERVICE) throw new Error("Missing backend env");

const run = Date.now().toString(36);
const tag = `[TEST ${run}]`;
const mail = (n: string) => `test+${run}-${n}@hoi-test.invalid`;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const createdUsers: string[] = [];
let pass = 0, fail = 0;
const results: string[] = [];

function check(name: string, ok: boolean, info = "") {
  if (ok) { pass++; results.push(`PASS ${name}`); } else { fail++; results.push(`FAIL ${name} ${info}`); }
}

async function login(email: string): Promise<SupabaseClient> {
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  createdUsers.push(link.user.id);
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: e2 } = await c.auth.verifyOtp({ type: "email", token_hash: link.properties.hashed_token });
  if (e2) throw e2;
  return c;
}

async function main() {
  // Catalogue
  const { data: ch } = await admin.from("chapters").select("id,name,households");
  check("T1 42 chapters", ch?.length === 42);
  check("T1 households total 20943", ch?.reduce((s, c) => s + (c.households ?? 0), 0) === 20943);
  check("T1 Công An households NULL", ch?.find((c) => c.id === "ch42")?.households === null && ch?.find((c) => c.id === "ch42")?.name === "Công An");

  // Test office admin (granted by service role, never the real admin account)
  const seedAdmin = await admin.from("app_users").insert({ email: mail("admin"), office_role: "admin", note: tag });
  check("T0 seed test office admin", !seedAdmin.error, seedAdmin.error?.message);
  const A = await login(mail("admin"));
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });

  // Anonymous
  const an = await anon.from("chapters").select("id");
  check("T2 anon cannot read chapters", (an.data?.length ?? 0) === 0);

  // Office grants via UI RPC
  for (const [n, chs, sens] of [["a", ["ch01"], false], ["b", ["ch02"], false], ["sens", ["ch01"], true]] as const) {
    const r = await A.rpc("set_user_access", { _email: mail(n), _office_role: null as unknown as string, _sensitive: sens, _chapters: [...chs], _note: tag });
    check(`T3 admin grants ${n}`, !r.error, r.error?.message);
  }
  const ca = await login(mail("a"));
  const cb = await login(mail("b"));
  const cs = await login(mail("sens"));
  const out = await login(mail("outsider"));

  // Outsider with valid JWT
  check("T4 outsider sees 0 chapters", ((await out.from("chapters").select("id")).data?.length ?? -1) === 0);
  const oi = await out.from("submissions").insert({ chapter_id: "ch01", kind: "report", title: tag, created_by: "x" });
  check("T4 outsider insert rejected", !!oi.error);
  const og = await out.rpc("set_user_access", { _email: mail("outsider"), _office_role: "admin", _sensitive: true, _chapters: ["ch01"] });
  check("T4 outsider self-grant rejected", !!og.error);
  check("T4 outsider backup rejected", !!(await out.rpc("export_backup")).error);
  const req = await out.from("access_requests").insert({ email: mail("outsider"), user_id: (await out.auth.getUser()).data.user!.id, message: tag });
  check("T4 outsider can file access request", !req.error, req.error?.message);
  const fakeReq = await out.from("access_requests").insert({ email: "someone@else.org", user_id: (await out.auth.getUser()).data.user!.id });
  check("T4 cannot request for another email", !!fakeReq.error);

  // Documents & tasks by office
  const d1 = await A.from("documents").insert({ direction: "out", title: `${tag} VB chung`, body: "noi dung", scope: "all", status: "published", is_test: true, created_by: "forged@x.org" }).select().single();
  check("T5 document create", !d1.error, d1.error?.message);
  check("T5 created_by not forgeable", d1.data?.created_by === mail("admin"));
  const d2 = await A.from("documents").insert({ direction: "out", title: `${tag} VB ch02`, scope: "selected", status: "published", is_test: true, created_by: "" }).select().single();
  await A.from("document_recipients").insert({ document_id: d2.data!.id, chapter_id: "ch02" });
  const d3 = await A.from("documents").insert({ direction: "in", title: `${tag} VB nhap`, status: "draft", is_test: true, created_by: "" }).select().single();
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const t1 = await A.from("tasks").insert({ title: `${tag} NV`, due_at: yesterday, is_test: true, created_by: "" }).select().single();
  if (t1.error) throw new Error("task: " + t1.error.message);
  await A.from("task_assignments").insert([{ task_id: t1.data!.id, chapter_id: "ch01" }, { task_id: t1.data!.id, chapter_id: "ch02" }]);
  const upd = await A.from("documents").update({ title: `${tag} VB chung (sua)` }).eq("id", d1.data!.id);
  check("T5 document update", !upd.error);

  // Chapter A isolation
  const chA = (await ca.from("chapters").select("id")).data?.map((x) => x.id);
  check("T6 A sees only ch01", JSON.stringify(chA) === '["ch01"]', JSON.stringify(chA));
  const docsA = (await ca.from("documents").select("id")).data?.map((x) => x.id) ?? [];
  check("T6 A sees broadcast doc", docsA.includes(d1.data!.id));
  check("T6 A cannot see ch02/draft docs", !docsA.includes(d2.data!.id) && !docsA.includes(d3.data!.id));
  check("T6 A cross-chapter submission rejected", !!(await ca.from("submissions").insert({ chapter_id: "ch02", kind: "report", title: tag, created_by: "" })).error);
  check("T6 A fake chapter_id rejected", !!(await ca.from("submissions").insert({ chapter_id: "ch99", kind: "report", title: tag, created_by: "" })).error);
  check("T6 A cross-chapter members rejected", !!(await ca.from("member_counts").insert({ chapter_id: "ch02", period: "2026-10", members_total: 5, updated_by: "" })).error);
  check("T6 A cross-chapter task update rejected", !!(await ca.rpc("update_assignment", { _task: t1.data!.id, _chapter: "ch02", _status: "completed", _progress: 100, _note: "" })).error);
  await ca.from("app_users").update({ office_role: "admin" }).eq("email", mail("a"));
  const accA = (await ca.rpc("my_access")).data as { office: boolean };
  check("T6 A fake role escalation blocked", accA?.office === false);
  const s1 = await ca.from("submissions").insert({ chapter_id: "ch01", kind: "report", title: `${tag} BC A`, body: "noi dung bao cao", is_test: true, created_by: "" }).select().single();
  check("T6 A submits report", !s1.error, s1.error?.message);
  const mc = await ca.from("member_counts").upsert({ chapter_id: "ch01", period: "2026-10", members_total: 120, members_new: 3, members_left: 1, updated_by: "" }).select().single();
  check("T6 A member count stamped", mc.data?.updated_by === mail("a"), mc.error?.message);
  check("T6 A updates own task progress", !(await ca.rpc("update_assignment", { _task: t1.data!.id, _chapter: "ch01", _status: "in_progress", _progress: 50, _note: tag })).error);
  check("T6 A cannot read audit log", ((await ca.from("audit_log").select("id")).data?.length ?? 0) === 0);

  // Chapter B
  check("T7 B cannot see A report", ((await cb.from("submissions").select("id")).data?.length ?? 0) === 0);
  check("T7 B list_submissions empty", (((await cb.rpc("list_submissions", {})).data as unknown[])?.length ?? 0) === 0);
  check("T7 B cannot withdraw A report", !!(await cb.rpc("withdraw_submission", { _id: s1.data!.id })).error);
  check("T7 B sees addressed doc", ((await cb.from("documents").select("id").eq("id", d2.data!.id)).data?.length ?? 0) === 1);

  // Withdraw
  check("T8 A withdraws own report", !(await ca.rpc("withdraw_submission", { _id: s1.data!.id })).error);
  check("T8 double withdraw rejected", !!(await ca.rpc("withdraw_submission", { _id: s1.data!.id })).error);
  const own = ((await ca.rpc("list_submissions", {})).data as { id: string; body: string | null }[]).find((x) => x.id === s1.data!.id);
  check("T8 author still sees own withdrawn body", own?.body === "noi dung bao cao");
  check("T8 office cannot read withdrawn row", ((await A.from("submissions").select("body").eq("id", s1.data!.id)).data?.length ?? 0) === 0);
  const offRow = ((await A.rpc("list_submissions", { _limit: 100 })).data as { id: string; body: string | null; status: string }[]).find((x) => x.id === s1.data!.id);
  check("T8 office sees status, body hidden", offRow?.status === "withdrawn" && offRow.body === null);
  const aud = await A.from("audit_log").select("action,resource_id").eq("resource_id", s1.data!.id);
  check("T8 audit has withdraw", !!aud.data?.some((x) => x.action === "withdraw"));

  // Document withdraw / task archive / restore
  await A.from("documents").update({ status: "withdrawn" }).eq("id", d1.data!.id);
  check("T9 withdrawn doc hidden from chapter", ((await ca.from("documents").select("id").eq("id", d1.data!.id)).data?.length ?? 0) === 0);
  await A.from("tasks").update({ status: "archived" }).eq("id", t1.data!.id);
  check("T9 archived task hidden", ((await ca.from("tasks").select("id").eq("id", t1.data!.id)).data?.length ?? 0) === 0);
  check("T9 cannot update archived task", !!(await ca.rpc("update_assignment", { _task: t1.data!.id, _chapter: "ch01", _status: "completed", _progress: 100, _note: "" })).error);
  await A.from("tasks").update({ status: "active" }).eq("id", t1.data!.id);
  check("T9 restored task visible", ((await ca.from("tasks").select("id").eq("id", t1.data!.id)).data?.length ?? 0) === 1);
  const sum = (await A.rpc("office_summary", {})).data as { chapter_id: string; overdue_tasks: number; households: number | null }[];
  check("T9 summary 42 rows", sum?.length === 42);
  check("T9 overdue counted", sum?.find((r) => r.chapter_id === "ch02")?.overdue_tasks! >= 1);

  // Sensitive
  const sc = await cs.from("sensitive_cases").insert({ chapter_id: "ch01", category: "child", summary: `${tag} ho so`, details: "chi tiet", created_by: "" }).select().single();
  check("T10 sensitive officer creates case", !sc.error, sc.error?.message);
  check("T10 ordinary chapter cannot see case", ((await ca.from("sensitive_cases").select("id")).data?.length ?? 0) === 0);
  check("T10 ordinary chapter insert rejected", !!(await ca.from("sensitive_cases").insert({ chapter_id: "ch01", category: "other", summary: tag, created_by: "" })).error);
  check("T10 office admin w/o flag cannot see case", ((await A.from("sensitive_cases").select("id")).data?.length ?? 0) === 0);
  const pii = await A.from("audit_log").select("resource_id").ilike("resource_id", "%ho so%");
  check("T10 no PII in audit log", (pii.data?.length ?? 0) === 0);

  // Files
  const s2 = await ca.from("submissions").insert({ chapter_id: "ch01", kind: "activity", title: `${tag} HD`, is_test: true, created_by: "" }).select().single();
  const path = `submission/${s2.data!.id}/${run}.pdf`;
  const pdf = new Blob(["%PDF-1.4 test"], { type: "application/pdf" });
  const up = await ca.storage.from("evidence").upload(path, pdf, { contentType: "application/pdf" });
  check("T11 A uploads evidence", !up.error, up.error?.message);
  await ca.from("attachments").insert({ owner_type: "submission", owner_id: s2.data!.id, path, filename: "minh-chung.pdf", mime: "application/pdf", size_bytes: 13, created_by: "" });
  check("T11 A downloads own file", !(await ca.storage.from("evidence").download(path)).error);
  check("T11 office downloads file", !(await A.storage.from("evidence").download(path)).error);
  check("T11 B cannot download A file", !!(await cb.storage.from("evidence").download(path)).error);
  check("T11 outsider cannot download", !!(await out.storage.from("evidence").download(path)).error);
  check("T11 B cannot upload into A report", !!(await cb.storage.from("evidence").upload(`submission/${s2.data!.id}/x.pdf`, pdf)).error);
  check("T11 bad path rejected", !!(await ca.storage.from("evidence").upload(`other/${run}.pdf`, pdf)).error);
  const signed = await cb.storage.from("evidence").createSignedUrl(path, 60);
  check("T11 B cannot sign A file", !!signed.error || !signed.data?.signedUrl);

  // Revoke (JWT still valid)
  check("T12 revoke A", !(await A.rpc("revoke_user_access", { _email: mail("a") })).error);
  check("T12 revoked: 0 chapters", ((await ca.from("chapters").select("id")).data?.length ?? -1) === 0);
  check("T12 revoked: loses own reports", ((await ca.from("submissions").select("id")).data?.length ?? -1) === 0);
  const rs = await ca.storage.from("evidence").createSignedUrl(path, 60);
  check("T12 revoked: cannot create file link", !!rs.error || !rs.data?.signedUrl);
  const dl = await ca.storage.from("evidence").download(path);
  check("T12 revoked: cannot download", !!dl.error, dl.error ? "" : "download still succeeded");
  const info = await ca.storage.from("evidence").list(`submission/${s2.data!.id}`);
  check("T12 revoked: cannot list files", (info.data?.length ?? 0) === 0);
  check("T12 revoked: write rejected", !!(await ca.from("submissions").insert({ chapter_id: "ch01", kind: "report", title: tag, created_by: "" })).error);
  check("T12 bootstrap admin not revocable", !!(await A.rpc("revoke_user_access", { _email: "ubmttqvnphuongsontra@gmail.com" })).error);

  // Backup / restore
  const b = (await A.rpc("export_backup")).data as Record<string, unknown>;
  check("T13 backup excludes sensitive", !!b && !("sensitive_cases" in b));
  const bad = structuredClone(b) as { chapters: { households: number | null }[] };
  bad.chapters[41].households = 999;
  const rb = await A.rpc("restore_backup", { _b: bad, _dry_run: false });
  check("T13 tampered catalogue rejected", !!rb.error && /chapter_catalogue_mismatch/.test(rb.error.message));
  const dry = await A.rpc("restore_backup", { _b: b, _dry_run: true });
  check("T13 dry-run rolls back", !!dry.error && dry.error.message.startsWith("DRY_RUN:"));
  const real = await A.rpc("restore_backup", { _b: b, _dry_run: false });
  check("T13 restore inserts nothing duplicate", !real.error && (real.data as { documents: number }).documents === 0, real.error?.message);
}

async function cleanup() {
  // remove only this run's rows
  const like = `%${tag}%`;
  const subs = (await admin.from("submissions").select("id").like("title", like)).data?.map((x) => x.id) ?? [];
  const atts = (await admin.from("attachments").select("path").in("owner_id", subs.length ? subs : ["00000000-0000-0000-0000-000000000000"])).data?.map((x) => x.path) ?? [];
  if (atts.length) await admin.storage.from("evidence").remove(atts);
  await admin.from("attachments").delete().in("path", atts.length ? atts : ["-"]);
  await admin.from("submissions").delete().like("title", like);
  await admin.from("sensitive_cases").delete().like("summary", like);
  await admin.from("tasks").delete().like("title", like);
  await admin.from("documents").delete().like("title", like);
  await admin.from("member_counts").delete().eq("chapter_id", "ch01").eq("period", "2026-10").like("updated_by", `test+${run}-%`);
  await admin.from("access_requests").delete().like("email", `test+${run}-%`);
  await admin.from("app_users").delete().like("email", `test+${run}-%`);
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id);
}

try { await main(); } catch (e) { fail++; results.push(`FAIL crashed: ${(e as Error).message}`); }
finally { await cleanup(); }
console.log(results.join("\n"));
console.log(`\n${pass} passed, ${fail} failed (run ${run}; only this run's test rows/users removed)`);
process.exit(fail ? 1 : 0);
