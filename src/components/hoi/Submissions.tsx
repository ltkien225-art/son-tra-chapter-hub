import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { KIND_LABEL, downloadCsv, fmtDateTime, thisPeriod } from "@/lib/hoi";
import { Attachments } from "./Attachments";
import { ChapterName, Empty, Pager, Section, useAction, type Ctx } from "./common";

type Row = { id: string; chapter_id: string; kind: string; title: string; body: string | null; period: string | null; status: string; created_by: string; created_at: string; total: number };
const SIZE = 20;

export function Submissions({ ctx }: { ctx: Ctx }) {
  const office = ctx.access.office;
  const qc = useQueryClient();
  const { busy, run } = useAction();
  const [page, setPage] = useState(0);
  const [f, setF] = useState({ chapter: "", kind: "", status: "" });
  const [form, setForm] = useState({ kind: "report", title: "", body: "", period: thisPeriod() });
  const [open, setOpen] = useState<string | null>(null);
  const chapter = office ? f.chapter || null : ctx.chapterId;

  const { data: rows = [] } = useQuery({
    queryKey: ["submissions", chapter, f.kind, f.status, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_submissions", {
        _chapter: chapter as string, _kind: (f.kind || null) as string, _status: (f.status || null) as string, _limit: SIZE, _offset: page * SIZE,
      });
      if (error) throw error;
      return data as Row[];
    },
  });
  const total = rows[0]?.total ?? 0;
  const refresh = () => qc.invalidateQueries({ queryKey: ["submissions"] });

  async function submit() {
    if (!ctx.chapterId) return;
    const ok = await run(() => supabase.from("submissions").insert({
      chapter_id: ctx.chapterId!, kind: form.kind, title: form.title.trim(), body: form.body, period: form.period || null, created_by: "",
    }), "Đã gửi lên Văn phòng Hội. Bạn có thể đính kèm minh chứng trong lịch sử gửi.");
    if (ok) { setForm({ ...form, title: "", body: "" }); setPage(0); refresh(); }
  }

  async function exportCsv() {
    const all: Row[] = [];
    for (let p = 0; p < 100; p++) {
      const { data } = await supabase.rpc("list_submissions", { _chapter: chapter as string, _kind: (f.kind || null) as string, _status: (f.status || null) as string, _limit: 100, _offset: p * 100 });
      all.push(...((data as Row[]) ?? []));
      if (!data || data.length < 100) break;
    }
    // ordinary export: metadata only, no content body
    downloadCsv(`tong-hop-bao-cao-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Chi hội", "Loại", "Tiêu đề", "Kỳ", "Trạng thái", "Thời gian gửi"],
      ...all.map((r) => [ctx.chapters.find((c) => c.id === r.chapter_id)?.name ?? r.chapter_id, KIND_LABEL[r.kind], r.title, r.period, r.status === "withdrawn" ? "Đã thu hồi" : "Đã gửi", fmtDateTime(r.created_at)]),
    ]);
  }

  return (
    <Section title={office ? "Tổng hợp báo cáo, hoạt động, phản ánh" : "Gửi báo cáo & lịch sử"}
      action={office && <Button size="xl" variant="soft" onClick={exportCsv}>Xuất CSV (không kèm nội dung)</Button>}>
      {!office && ctx.chapterId && (
        <div className="panel space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Loại</label>
              <select className="field" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="label">Kỳ (tháng)</label><input type="month" className="field" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></div>
          </div>
          <div><label className="label">Tiêu đề *</label><input className="field" maxLength={180} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="label">Nội dung</label><textarea className="field" maxLength={10000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Không ghi họ tên, số điện thoại, địa chỉ của phụ nữ/trẻ em cần hỗ trợ. Hồ sơ nhạy cảm dùng mục riêng." /></div>
          <Button size="xl" className="w-full sm:w-auto" disabled={busy || !form.title.trim()} onClick={submit}>Gửi lên Văn phòng</Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {office && (
          <select className="field max-w-[13rem]" value={f.chapter} onChange={(e) => { setF({ ...f, chapter: e.target.value }); setPage(0); }}>
            <option value="">Tất cả Chi hội</option>{ctx.chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        )}
        <select className="field max-w-[13rem]" value={f.kind} onChange={(e) => { setF({ ...f, kind: e.target.value }); setPage(0); }}>
          <option value="">Mọi loại</option>{Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="field max-w-[11rem]" value={f.status} onChange={(e) => { setF({ ...f, status: e.target.value }); setPage(0); }}>
          <option value="">Mọi trạng thái</option><option value="submitted">Đã gửi</option><option value="withdrawn">Đã thu hồi</option></select>
      </div>

      {rows.length === 0 ? <Empty>Chưa có mục nào.</Empty> : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const mine = r.created_by === ctx.access.email;
            return (
              <li key={r.id} className="panel p-4">
                <button className="w-full text-left" onClick={() => setOpen(open === r.id ? null : r.id)}>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="chip">{KIND_LABEL[r.kind]}</span>
                    <span className={r.status === "withdrawn" ? "chip chip-danger" : "chip chip-ok"}>{r.status === "withdrawn" ? "Đã thu hồi" : "Đã gửi"}</span>
                    {office && <span className="font-semibold"><ChapterName id={r.chapter_id} chapters={ctx.chapters} /></span>}
                    <span className="text-muted-foreground">{r.period ?? ""} · {fmtDateTime(r.created_at)}</span>
                  </div>
                  <p className="mt-1 text-base font-semibold">{r.title}</p>
                </button>
                {open === r.id && (
                  <div className="mt-3 space-y-3 border-t border-border pt-3">
                    {r.body === null ? <p className="text-sm italic text-muted-foreground">Nội dung đã được Chi hội thu hồi.</p>
                      : <p className="whitespace-pre-wrap text-sm">{r.body || "—"}</p>}
                    <p className="text-xs text-muted-foreground">Người gửi: {r.created_by}</p>
                    {(r.status === "submitted" || mine) && <Attachments ownerType="submission" ownerId={r.id} canUpload={mine && r.status === "submitted"} />}
                    {(mine || ctx.access.admin) && r.status === "submitted" && (
                      <Button variant="destructive" size="xl" disabled={busy}
                        onClick={() => confirm("Thu hồi mục này? Văn phòng sẽ không còn đọc được nội dung.") && run(() => supabase.rpc("withdraw_submission", { _id: r.id }), "Đã thu hồi.").then(refresh)}>
                        Thu hồi
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Pager page={page} total={Number(total)} size={SIZE} onPage={setPage} />
    </Section>
  );
}
