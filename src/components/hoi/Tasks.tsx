import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ASSIGN_STATUS, TASK_STATUS, fmtDate, isOverdue } from "@/lib/hoi";
import { ChapterName, ChapterPicker, Empty, Section, useAction, type Ctx } from "./common";

type Assign = { task_id: string; chapter_id: string; status: string; progress: number; note: string; updated_at: string };
type Task = { id: string; title: string; description: string; due_at: string | null; status: string; is_test: boolean; created_at: string; task_assignments: Assign[] };

export function Tasks({ ctx }: { ctx: Ctx }) {
  const office = ctx.access.office;
  const qc = useQueryClient();
  const { busy, run } = useAction();
  const [view, setView] = useState("active");
  const [form, setForm] = useState<{ title: string; description: string; due_at: string; chapters: string[] } | null>(null);
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

  async function create() {
    if (!form) return;
    const ok = await run(async () => {
      const r = await supabase.from("tasks").insert({ title: form.title.trim(), description: form.description, due_at: form.due_at || null, created_by: "" }).select("id").single();
      if (r.error) return r;
      return supabase.from("task_assignments").insert(form.chapters.map((c) => ({ task_id: r.data.id, chapter_id: c })));
    }, "Đã giao nhiệm vụ.");
    if (ok) { setForm(null); refresh(); }
  }

  return (
    <Section title={office ? "Nhiệm vụ & tiến độ" : "Nhiệm vụ được giao"}
      action={office && !form && <Button size="xl" onClick={() => setForm({ title: "", description: "", due_at: "", chapters: [] })}>＋ Giao nhiệm vụ</Button>}>
      {form && (
        <div className="panel space-y-4 p-5">
          <div><label className="label">Tên nhiệm vụ *</label><input className="field" maxLength={300} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="label">Yêu cầu</label><textarea className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><label className="label">Hạn hoàn thành</label><input type="date" className="field max-w-xs" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} /></div>
          <div><label className="label">Giao cho Chi hội *</label><ChapterPicker chapters={ctx.chapters} value={form.chapters} onChange={(v) => setForm({ ...form, chapters: v })} /></div>
          <div className="flex gap-2">
            <Button size="xl" disabled={busy || !form.title.trim() || !form.chapters.length} onClick={create}>Giao</Button>
            <Button size="xl" variant="soft" onClick={() => setForm(null)}>Hủy</Button>
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
            const mine = office ? t.task_assignments : t.task_assignments.filter((a) => a.chapter_id === ctx.chapterId);
            const done = t.task_assignments.filter((a) => a.status === "completed").length;
            const overdue = t.status === "active" && mine.some((a) => isOverdue(t.due_at, a.status));
            return (
              <li key={t.id} className="panel p-4">
                <button className="w-full text-left" onClick={() => setOpen(open === t.id ? null : t.id)}>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Hạn: {fmtDate(t.due_at)}</span>
                    {overdue && <span className="chip chip-danger">Quá hạn</span>}
                    {t.is_test && <span className="chip chip-warn">[TEST]</span>}
                    {office && <span className="chip">{done}/{t.task_assignments.length} hoàn thành</span>}
                  </div>
                  <p className="mt-1 text-base font-semibold">{t.title}</p>
                </button>
                {open === t.id && (
                  <div className="mt-3 space-y-3 border-t border-border pt-3">
                    <p className="whitespace-pre-wrap text-sm">{t.description || "—"}</p>
                    {office ? (
                      <>
                        <div className="overflow-auto"><table className="tbl"><thead><tr><th>Chi hội</th><th>Trạng thái</th><th>%</th><th>Ghi chú</th></tr></thead>
                          <tbody>{t.task_assignments.map((a) => (
                            <tr key={a.chapter_id}><td><ChapterName id={a.chapter_id} chapters={ctx.chapters} /></td>
                              <td>{ASSIGN_STATUS[a.status]}{isOverdue(t.due_at, a.status) && t.status === "active" && <span className="chip chip-danger ml-1">Quá hạn</span>}</td>
                              <td>{a.progress}</td><td className="whitespace-pre-wrap">{a.note}</td></tr>))}</tbody></table></div>
                        <div className="flex flex-wrap gap-2">
                          {t.status !== "active" && <Button size="xl" onClick={() => run(() => supabase.from("tasks").update({ status: "active" }).eq("id", t.id), "Đã khôi phục.").then(refresh)}>Khôi phục</Button>}
                          {t.status === "active" && <Button size="xl" variant="soft" onClick={() => run(() => supabase.from("tasks").update({ status: "archived" }).eq("id", t.id), "Đã lưu trữ.").then(refresh)}>Lưu trữ</Button>}
                          {t.status === "active" && <Button size="xl" variant="destructive" onClick={() => confirm("Thu hồi nhiệm vụ này?") && run(() => supabase.from("tasks").update({ status: "withdrawn" }).eq("id", t.id), "Đã thu hồi.").then(refresh)}>Thu hồi</Button>}
                        </div>
                      </>
                    ) : mine.map((a) => <AssignForm key={a.chapter_id} a={a} onDone={refresh} />)}
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
      <Button size="xl" disabled={busy} onClick={() => run(() => supabase.rpc("update_assignment", { _task: a.task_id, _chapter: a.chapter_id, _status: s.status, _progress: s.progress, _note: s.note }), "Đã cập nhật tiến độ.").then(onDone)}>Cập nhật</Button>
    </div>
  );
}
