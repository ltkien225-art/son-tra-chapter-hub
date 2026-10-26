import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ASSIGN_STATUS, TASK_STATUS, fmtDate, fmtDateTime, isOverdue } from "@/lib/hoi";
import { Attachments, FilePicker } from "./Attachments";
import { ChapterName, ChapterPicker, Empty, Section, useAction, type Ctx } from "./common";

type Assign = { task_id: string; chapter_id: string; status: string; progress: number; note: string; updated_at: string };
type Task = { id: string; title: string; description: string; due_at: string | null; status: string; is_test: boolean; created_at: string; task_assignments: Assign[] };
type Form = { title: string; description: string; due_at: string; chapters: string[] };

export function Tasks({ ctx }: { ctx: Ctx }) {
  const office = ctx.access.office;
  const qc = useQueryClient();
  const { busy, run } = useAction();
  const [view, setView] = useState("active");
  const [form, setForm] = useState<Form | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [pending, setPending] = useState<File[]>([]);
  const [auto, setAuto] = useState<File[] | undefined>(undefined);
  const [open, setOpen] = useState<string | null>(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", office, view, ctx.chapterId],
    queryFn: async () => {
      let q = supabase.from("tasks").select("*, task_assignments(*)").order("due_at", { ascending: true, nullsFirst: false }).limit(200);
      if (office) q = q.eq("status", view);
      const { data, error } = await q;
      if (error) throw error;
      return data as Task[];
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["summary"] }); };
  const close = () => { setForm(null); setEditId(null); setPending([]); setAuto(undefined); };

  async function save() {
    if (!form) return;
    let id = editId;
    const before = tasks.find((t) => t.id === editId)?.task_assignments.map((a) => a.chapter_id) ?? [];
    const ok = await run(async () => {
      const payload = { title: form.title.trim(), description: form.description, due_at: form.due_at || null };
      if (id) {
        const r = await supabase.from("tasks").update(payload).eq("id", id);
        if (r.error) return r;
      } else {
        const r = await supabase.from("tasks").insert({ ...payload, created_by: "" }).select("id").single();
        if (r.error) return r;
        id = r.data.id;
      }
      const removed = before.filter((c) => !form.chapters.includes(c));
      if (removed.length) {
        const d = await supabase.from("task_assignments").delete().eq("task_id", id!).in("chapter_id", removed);
        if (d.error) return d;
      }
      const added = form.chapters.filter((c) => !before.includes(c));
      if (added.length) return supabase.from("task_assignments").insert(added.map((c) => ({ task_id: id!, chapter_id: c })));
      return undefined;
    }, editId ? "Đã lưu thay đổi nhiệm vụ." : "Đã giao nhiệm vụ.");
    if (!ok) return;
    refresh();
    if (!editId && pending.length) { setAuto(pending); setPending([]); setEditId(id); return; }
    close();
  }

  const canEdit = office && !ctx.officeView;
  return (
    <Section title={office ? "Nhiệm vụ & tiến độ" : "Nhiệm vụ được giao"}
      action={canEdit && !form && <Button size="xl" onClick={() => { close(); setForm({ title: "", description: "", due_at: "", chapters: [] }); }}>＋ Giao nhiệm vụ</Button>}>
      {ctx.officeView && (
        <p className="panel p-4 text-sm text-muted-foreground">
          Chế độ Văn phòng chỉ xem. Khi Chi hội mở liên kết Sổ riêng của mình, tại đây sẽ hiện ô “Gửi kết quả / minh chứng về Văn phòng” kèm nút lớn “📎 Đính kèm PDF / ảnh / minh chứng” trong từng nhiệm vụ.
        </p>
      )}
      {form && (
        <div className="panel space-y-4 p-5">
          <p className="font-bold text-primary">{editId ? "Sửa nhiệm vụ / đổi phân công" : "Giao nhiệm vụ mới"}</p>
          <div><label className="label">Tên nhiệm vụ *</label><input className="field" maxLength={300} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="label">Yêu cầu</label><textarea className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><label className="label">Hạn hoàn thành</label><input type="date" className="field max-w-xs" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} /></div>
          <div><label className="label">Giao cho Chi hội * (bỏ chọn để bỏ phân công)</label><ChapterPicker chapters={ctx.chapters} value={form.chapters} onChange={(v) => setForm({ ...form, chapters: v })} /></div>
          {editId ? <Attachments ownerType="task" ownerId={editId} canUpload autoFiles={auto} title="Tệp hướng dẫn / biểu mẫu kèm nhiệm vụ" />
            : <FilePicker files={pending} onChange={setPending} />}
          <div className="flex flex-wrap gap-2">
            <Button size="xl" disabled={busy || !form.title.trim() || !form.chapters.length} onClick={save}>
              {editId ? "Lưu thay đổi" : pending.length ? `Giao & tải ${pending.length} tệp` : "Giao"}</Button>
            <Button size="xl" variant="soft" onClick={close}>{editId ? "Xong" : "Hủy"}</Button>
          </div>
        </div>
      )}
      {office && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(TASK_STATUS).map(([k, v]) => (
            <Button key={k} size="xl" variant={view === k ? "default" : "soft"} onClick={() => setView(k)}>{v}</Button>
          ))}
        </div>
      )}
      {tasks.length === 0 ? <Empty>Chưa có nhiệm vụ.</Empty> : (
        <ul className="space-y-3">
          {tasks.map((t) => {
            const showAll = office && !ctx.officeView;
            const mine = showAll ? t.task_assignments : t.task_assignments.filter((a) => a.chapter_id === ctx.chapterId);
            if (!showAll && mine.length === 0) return null;
            const done = t.task_assignments.filter((a) => a.status === "completed").length;
            const overdue = t.status === "active" && mine.some((a) => isOverdue(t.due_at, a.status));
            return (
              <li key={t.id} className="panel p-4">
                <button className="w-full text-left" onClick={() => setOpen(open === t.id ? null : t.id)}>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Hạn: {fmtDate(t.due_at)}</span>
                    {overdue && <span className="chip chip-danger">Quá hạn</span>}
                    {t.is_test && <span className="chip chip-warn">[TEST]</span>}
                    {showAll && <span className="chip">{done}/{t.task_assignments.length} hoàn thành</span>}
                  </div>
                  <p className="mt-1 text-base font-semibold">{t.title}</p>
                </button>
                {open === t.id && (
                  <div className="mt-3 space-y-3 border-t border-border pt-3">
                    <p className="whitespace-pre-wrap text-sm">{t.description || "—"}</p>
                    <Attachments ownerType="task" ownerId={t.id} canUpload={false} title="Tệp kèm nhiệm vụ" />
                    {showAll ? (
                      <>
                        <div className="overflow-auto"><table className="tbl"><thead><tr><th>Chi hội</th><th>Trạng thái</th><th>%</th><th>Ghi chú</th></tr></thead>
                          <tbody>{t.task_assignments.map((a) => (
                            <tr key={a.chapter_id}><td><ChapterName id={a.chapter_id} chapters={ctx.chapters} /></td>
                              <td>{ASSIGN_STATUS[a.status]}{isOverdue(t.due_at, a.status) && t.status === "active" && <span className="chip chip-danger ml-1">Quá hạn</span>}</td>
                              <td>{a.progress}</td><td className="whitespace-pre-wrap">{a.note}</td></tr>))}</tbody></table></div>
                        <TaskResults taskId={t.id} ctx={ctx} />
                        <div className="flex flex-wrap gap-2">
                          {t.status === "active" && <Button size="xl" variant="soft" onClick={() => { setPending([]); setAuto(undefined); setEditId(t.id); setForm({ title: t.title, description: t.description, due_at: t.due_at ?? "", chapters: t.task_assignments.map((a) => a.chapter_id) }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Sửa / đính kèm / đổi phân công</Button>}
                          {t.status !== "active" && <Button size="xl" onClick={() => run(() => supabase.from("tasks").update({ status: "active" }).eq("id", t.id), "Đã khôi phục.").then(refresh)}>Khôi phục</Button>}
                          {t.status === "active" && <Button size="xl" variant="soft" onClick={() => run(() => supabase.from("tasks").update({ status: "archived" }).eq("id", t.id), "Đã lưu trữ.").then(refresh)}>Lưu trữ</Button>}
                          {t.status === "active" && <Button size="xl" variant="destructive" onClick={() => confirm("Thu hồi nhiệm vụ này?") && run(() => supabase.from("tasks").update({ status: "withdrawn" }).eq("id", t.id), "Đã thu hồi.").then(refresh)}>Thu hồi</Button>}
                        </div>
                      </>
                    ) : mine.map((a) => (
                      <div key={a.chapter_id} className="space-y-3">
                        {ctx.officeView ? (
                          <>
                            <p className="rounded-xl bg-muted p-3 text-sm">Tiến độ: <b>{ASSIGN_STATUS[a.status]}</b> · {a.progress}%{a.note && <> · {a.note}</>}</p>
                            <p className="text-xs text-muted-foreground">Chế độ Văn phòng chỉ xem. Chi hội mở liên kết Sổ riêng sẽ thấy ô “Gửi kết quả / minh chứng về Văn phòng” kèm nút đính kèm tệp tại đây.</p>
                          </>
                        ) : <AssignForm a={a} onDone={refresh} />}
                        <TaskResults taskId={t.id} ctx={ctx} chapterId={a.chapter_id} />
                        {!ctx.officeView && t.status === "active" && <ResultForm task={t} chapterId={a.chapter_id} />}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function AssignForm({ a, onDone }: { a: Assign; onDone: () => void }) {
  const { busy, run } = useAction();
  const [s, setS] = useState({ status: a.status, progress: a.progress, note: a.note });
  return (
    <div className="space-y-3 rounded-xl bg-muted p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Trạng thái</label>
          <select className="field" value={s.status} onChange={(e) => setS({ ...s, status: e.target.value, progress: e.target.value === "completed" ? 100 : s.progress })}>
            {Object.entries(ASSIGN_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label">Tiến độ: {s.progress}%</label>
          <input type="range" min={0} max={100} step={10} className="h-12 w-full accent-primary" value={s.progress} onChange={(e) => setS({ ...s, progress: +e.target.value })} /></div>
      </div>
      <div><label className="label">Ghi chú</label><textarea className="field" maxLength={2000} value={s.note} onChange={(e) => setS({ ...s, note: e.target.value })} /></div>
      <Button size="xl" disabled={busy} onClick={() => run(() => supabase.rpc("update_assignment", { _task: a.task_id, _chapter: a.chapter_id, _status: s.status, _progress: s.progress, _note: s.note }), "Đã cập nhật tiến độ.").then(onDone)}>Cập nhật tiến độ</Button>
    </div>
  );
}

/** Chapter sends a task result with PDF/photo evidence; stored as a submission linked to the task so the Office sees it in one place. */
function ResultForm({ task, chapterId }: { task: Task; chapterId: string }) {
  const qc = useQueryClient();
  const { busy, run } = useAction();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sent, setSent] = useState<{ id: string; files: File[] } | null>(null);
  async function send() {
    let id = "";
    const ok = await run(async () => {
      const r = await supabase.from("submissions").insert({ chapter_id: chapterId, kind: "result", task_id: task.id, title: `Kết quả: ${task.title}`.slice(0, 180), body, created_by: "" }).select("id").single();
      if (!r.error) id = r.data.id;
      return r;
    }, "Đã gửi kết quả lên Văn phòng.");
    if (!ok) return;
    setSent({ id, files }); setBody(""); setFiles([]);
    qc.invalidateQueries({ queryKey: ["task-results", task.id] });
    qc.invalidateQueries({ queryKey: ["submissions"] });
  }
  return (
    <div className="space-y-3 rounded-xl border border-border p-3">
      <p className="text-sm font-bold text-primary">Gửi kết quả / minh chứng về Văn phòng</p>
      {sent && sent.files.length > 0 && <Attachments ownerType="submission" ownerId={sent.id} canUpload autoFiles={sent.files} title="Tệp của kết quả vừa gửi" />}
      <textarea className="field" maxLength={10000} placeholder="Tóm tắt kết quả (không ghi thông tin cá nhân của người được hỗ trợ)" value={body} onChange={(e) => setBody(e.target.value)} />
      <FilePicker files={files} onChange={setFiles} />
      <Button size="xl" disabled={busy || (!body.trim() && !files.length)} onClick={send}>{files.length ? `Gửi kết quả & ${files.length} tệp` : "Gửi kết quả"}</Button>
    </div>
  );
}

function TaskResults({ taskId, ctx, chapterId }: { taskId: string; ctx: Ctx; chapterId?: string }) {
  const { data = [] } = useQuery({
    queryKey: ["task-results", taskId, chapterId],
    queryFn: async () => {
      let q = supabase.from("submissions").select("id,chapter_id,title,body,status,created_by,created_at").eq("task_id", taskId).order("created_at", { ascending: false });
      if (chapterId) q = q.eq("chapter_id", chapterId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
  if (!data.length) return <p className="text-sm text-muted-foreground">Chưa có kết quả/minh chứng gửi về.</p>;
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-primary">Kết quả đã gửi ({data.length})</p>
      {data.map((r) => (
        <div key={r.id} className="space-y-2 rounded-xl bg-muted p-3 text-sm">
          <p><b><ChapterName id={r.chapter_id} chapters={ctx.chapters} /></b> · {fmtDateTime(r.created_at)} {r.status === "withdrawn" && <span className="chip chip-danger">Đã thu hồi</span>}</p>
          {r.status === "withdrawn" ? <p className="italic text-muted-foreground">Nội dung đã thu hồi.</p> : <>
            <p className="whitespace-pre-wrap">{r.body || "—"}</p>
            <Attachments ownerType="submission" ownerId={r.id} canUpload={false} title="Minh chứng" />
          </>}
        </div>
      ))}
    </div>
  );
}
