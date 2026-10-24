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

/** Opens a file through the app's per-request permission gateway (/api/files/:id). Returns HTTP status. */
const APP = process.env.APP_URL ?? "http://localhost:8080";
async function gw(c: SupabaseClient | null, path: string): Promise<number> {
  const { data: att } = await admin.from("attachments").select("id").eq("path", path).maybeSingle();
  if (!att) return -1;
  const token = c ? (await c.auth.getSession()).data.session?.access_token : undefined;
  const r = await fetch(`${APP}/api/files/${att.id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  await r.arrayBuffer();
  return r.status;
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

  // Notification outbox (generated by backend triggers from current permissions)
  const ob = (await admin.from("notification_outbox").select("recipient_email,kind,title,body,dedupe_key").like("recipient_email", `test+${run}-%`)).data ?? [];
  const docKeysFor = (e: string) => ob.filter((o) => o.recipient_email === e && o.kind === "document").map((o) => o.dedupe_key);
  check("T5p chapter A notified of broadcast doc only", docKeysFor(mail("a")).length === 1 && docKeysFor(mail("a"))[0]!.includes(d1.data!.id));
  check("T5p chapter B notified of broadcast + addressed doc", docKeysFor(mail("b")).length === 2);
  check("T5p outsider never notified", !ob.some((o) => o.recipient_email === mail("outsider")));
  check("T5p draft doc not notified", !ob.some((o) => o.dedupe_key.includes(d3.data!.id)));
  check("T5p notifications contain no record text", !ob.some((o) => (o.title + o.body).includes("[TEST")));
  check("T5p task assignment notified to both chapters", ob.filter((o) => o.kind === "task").length >= 2);
  const psOut = await out.from("push_subscriptions").insert({ email: mail("outsider"), endpoint: "https://push.test/x", p256dh: "k", auth: "a" });
  check("T5p outsider cannot register device", !!psOut.error);
  const psFake = await ca.from("push_subscriptions").insert({ email: mail("b"), endpoint: "https://push.test/y", p256dh: "k", auth: "a" });
  check("T5p cannot register device for another email", !!psFake.error);
  const psOk = await ca.from("push_subscriptions").insert({ email: mail("a"), endpoint: `https://push.test/${run}`, p256dh: "k", auth: "a" });
  check("T5p chapter user registers own device", !psOk.error, psOk.error?.message);
  check("T5p B cannot see A devices", ((await cb.from("push_subscriptions").select("id")).data?.length ?? 0) === 0);

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
  {
    const ob2 = (await admin.from("notification_outbox").select("recipient_email,kind,url,title,body,dedupe_key").like("recipient_email", `test+${run}-%`)).data ?? [];
    const prog = ob2.filter((o) => o.kind === "progress");
    check("T6p office notified of chapter progress", prog.some((o) => o.recipient_email === mail("admin")) && prog.every((o) => o.url === "/app?tab=tasks"));
    check("T6p chapters not notified of other chapter progress", !prog.some((o) => o.recipient_email === mail("b")));
    check("T6p office notified of new submission", ob2.some((o) => o.kind === "submission" && o.recipient_email === mail("admin") && o.url === "/app?tab=subs"));
    // Office feedback → chapter (two-way)
    const fb = await A.from("submission_feedback").insert({ submission_id: s1.data!.id, body: `${tag} phan hoi` }).select().single();
    check("T6f office replies to submission", !fb.error, fb.error?.message);
    check("T6f chapter cannot post office feedback", !!(await ca.from("submission_feedback").insert({ submission_id: s1.data!.id, body: tag })).error);
    check("T6f author chapter reads feedback", ((await ca.from("submission_feedback").select("id").eq("submission_id", s1.data!.id)).data?.length ?? 0) === 1);
    check("T6f other chapter cannot read feedback", ((await cb.from("submission_feedback").select("id").eq("submission_id", s1.data!.id)).data?.length ?? 0) === 0);
    check("T6f outsider cannot read feedback", ((await out.from("submission_feedback").select("id")).data?.length ?? 0) === 0);
    const fbn = ((await admin.from("notification_outbox").select("recipient_email,url,title,body").like("dedupe_key", `fb:${fb.data?.id}%`)).data ?? []);
    check("T6f feedback push only to ch01 users, generic, deep link", fbn.map((o) => o.recipient_email).sort().join() === [mail("a"), mail("sens")].sort().join() && fbn.every((o) => o.url === "/app?tab=subs" && !(o.title + o.body).includes("[TEST")), JSON.stringify(fbn));
  }
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
  check("T11 A opens own file via gateway", (await gw(ca, path)) === 200);
  check("T11 gateway without token refused", (await gw(null, path)) === 401);
  check("T11 office opens file via gateway", (await gw(A, path)) === 200);
  check("T11 B refused A file via gateway", (await gw(cb, path)) === 403);
  check("T11 outsider refused via gateway", (await gw(out, path)) === 403);
  check("T11 direct storage read disabled even for owner", !!(await ca.storage.from("evidence").download(path)).error);
  check("T11 B cannot upload into A report", !!(await cb.storage.from("evidence").upload(`submission/${s2.data!.id}/x.pdf`, pdf)).error);
  check("T11 bad path rejected", !!(await ca.storage.from("evidence").upload(`other/${run}.pdf`, pdf)).error);
  const signed = await cb.storage.from("evidence").createSignedUrl(path, 60);
  check("T11 B cannot sign A file", !!signed.error || !signed.data?.signedUrl);
  // Fake / mismatched attachment records are rejected by the server
  check("T11 fake record without file rejected", !!(await ca.from("attachments").insert({ owner_type: "submission", owner_id: s2.data!.id, path: `submission/${s2.data!.id}/fake.pdf`, filename: "x.pdf", mime: "application/pdf", size_bytes: 13, created_by: "" })).error);
  const p2 = `submission/${s2.data!.id}/${run}-2.png`;
  const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0])], { type: "image/png" });
  check("T11 A uploads image", !(await ca.storage.from("evidence").upload(p2, png, { contentType: "image/png" })).error);
  check("T11 mismatched size/type rejected", !!(await ca.from("attachments").insert({ owner_type: "submission", owner_id: s2.data!.id, path: p2, filename: "a.png", mime: "application/pdf", size_bytes: 999, created_by: "" })).error);
  check("T11 matching image record accepted", !(await ca.from("attachments").insert({ owner_type: "submission", owner_id: s2.data!.id, path: p2, filename: "anh.png", mime: "image/png", size_bytes: 10, created_by: "" })).error);
  check("T11 office lists 2 files of report", ((await A.from("attachments").select("id").eq("owner_id", s2.data!.id)).data?.length ?? 0) === 2);
  // Task files: Office attaches; only assigned Chi hội can read; withdrawn task hides them
  const t2 = await A.from("tasks").insert({ title: `${tag} NV file`, is_test: true, created_by: "" }).select().single();
  await A.from("task_assignments").insert({ task_id: t2.data!.id, chapter_id: "ch01" });
  const tp = `task/${t2.data!.id}/${run}.pdf`;
  check("T11t chapter cannot upload into task", !!(await ca.storage.from("evidence").upload(`task/${t2.data!.id}/x.pdf`, pdf, { contentType: "application/pdf" })).error);
  check("T11t office uploads task PDF", !(await A.storage.from("evidence").upload(tp, pdf, { contentType: "application/pdf" })).error);
  check("T11t office records task PDF", !(await A.from("attachments").insert({ owner_type: "task", owner_id: t2.data!.id, path: tp, filename: "huong-dan.pdf", mime: "application/pdf", size_bytes: 13, created_by: "" })).error);
  check("T11t assigned chapter opens task PDF via gateway", (await gw(ca, tp)) === 200);
  check("T11t other chapter refused task PDF", (await gw(cb, tp)) === 403);
  // Result with evidence linked to task: Office reads, then withdrawn → Office loses it
  const r1 = await ca.from("submissions").insert({ chapter_id: "ch01", kind: "result", task_id: t2.data!.id, title: `${tag} KQ`, body: "ket qua", is_test: true, created_by: "" }).select().single();
  check("T11r chapter sends task result", !r1.error, r1.error?.message);
  const rp = `submission/${r1.data!.id}/${run}.pdf`;
  await ca.storage.from("evidence").upload(rp, pdf, { contentType: "application/pdf" });
  await ca.from("attachments").insert({ owner_type: "submission", owner_id: r1.data!.id, path: rp, filename: "kq.pdf", mime: "application/pdf", size_bytes: 13, created_by: "" });
  check("T11r office sees result for task", ((await A.from("submissions").select("id").eq("task_id", t2.data!.id)).data?.length ?? 0) === 1);
  check("T11r office opens result evidence via gateway", (await gw(A, rp)) === 200);
  await ca.rpc("withdraw_submission", { _id: r1.data!.id });
  { const st = await gw(A, rp); check("T11r after withdraw office gateway refused", st === 403, `status ${st}`); }
  check("T11r after withdraw office cannot list record", ((await A.from("attachments").select("id").eq("owner_id", r1.data!.id)).data?.length ?? 0) === 0);
  check("T11r after withdraw author cannot add files", !!(await ca.storage.from("evidence").upload(`submission/${r1.data!.id}/y.pdf`, pdf, { contentType: "application/pdf" })).error);
  await A.from("tasks").update({ status: "withdrawn" }).eq("id", t2.data!.id);
  { const st = await gw(ca, tp); check("T11t withdrawn task: chapter gateway refused", st === 403, `status ${st}`); }
  check("T11t withdrawn task: chapter cannot list file", ((await ca.from("attachments").select("id").eq("owner_id", t2.data!.id)).data?.length ?? 0) === 0);

  // Revoke (JWT still valid)
  check("T12 revoke A", !(await A.rpc("revoke_user_access", { _email: mail("a") })).error);
  check("T12 revoked: 0 chapters", ((await ca.from("chapters").select("id")).data?.length ?? -1) === 0);
  check("T12 revoked: loses own reports", ((await ca.from("submissions").select("id")).data?.length ?? -1) === 0);
  { const st = await gw(ca, path); check("T12 revoked (JWT still valid): file gateway refuses", st === 403, `status ${st}`); }
  for (let i = 0; i < 3; i++) { const st = await gw(ca, path); check(`T12 revoked: repeated request #${i + 1} still refused (no cache)`, st === 403, `status ${st}`); }
  { const rs = await ca.storage.from("evidence").createSignedUrl(path, 60); check("T12 revoked: cannot create signed link", !!rs.error || !rs.data?.signedUrl); }
  { const dl = await ca.storage.from("evidence").download(`${path}?r=${Date.now()}`); check("T12 revoked: direct storage read refused", !!dl.error); }
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
  const tks = (await admin.from("tasks").select("id").like("title", like)).data?.map((x) => x.id) ?? [];
  const owners = [...subs, ...tks];
  const atts = (await admin.from("attachments").select("path").in("owner_id", owners.length ? owners : ["00000000-0000-0000-0000-000000000000"])).data?.map((x) => x.path) ?? [];
  if (atts.length) await admin.storage.from("evidence").remove(atts);
  await admin.from("attachments").delete().in("path", atts.length ? atts : ["-"]);
  if (subs.length) await admin.from("submission_feedback").delete().in("submission_id", subs);
  await admin.from("submissions").delete().like("title", like);
  await admin.from("sensitive_cases").delete().like("summary", like);
  if (tks.length) await admin.from("task_assignments").delete().in("task_id", tks);
  await admin.from("tasks").delete().like("title", like);
  await admin.from("documents").delete().like("title", like);
  await admin.from("member_counts").delete().eq("chapter_id", "ch01").eq("period", "2026-10").like("updated_by", `test+${run}-%`);
  await admin.from("notification_outbox").delete().like("recipient_email", `test+${run}-%`);
  await admin.from("push_subscriptions").delete().like("email", `test+${run}-%`);
  await admin.from("access_requests").delete().like("email", `test+${run}-%`);
  await admin.from("app_users").delete().like("email", `test+${run}-%`);
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id);
}

try { await main(); } catch (e) { fail++; results.push(`FAIL crashed: ${(e as Error).message}`); }
finally { await cleanup(); }
console.log(results.join("\n"));
console.log(`\n${pass} passed, ${fail} failed (run ${run}; only this run's test rows/users removed)`);
process.exit(fail ? 1 : 0);
