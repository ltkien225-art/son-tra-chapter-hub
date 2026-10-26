import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DOC_STATUS, fmtDate } from "@/lib/hoi";
import { Attachments, FilePicker } from "./Attachments";
import { ChapterPicker, Empty, Section, useAction, type Ctx } from "./common";

type Doc = {
  id: string; direction: string; code: string; title: string; body: string; issuer: string; doc_date: string | null;
  scope: string; status: string; archived: boolean; is_test: boolean; created_at: string;
};

const blank = { direction: "out", code: "", title: "", body: "", issuer: "", doc_date: "", scope: "all", recipients: [] as string[] };

export function Documents({ ctx }: { ctx: Ctx }) {
  const office = ctx.access.office;
  const qc = useQueryClient();
  const { busy, run } = useAction();
  const [filter, setFilter] = useState({ direction: "", status: "", archived: false, q: "" });
  const [form, setForm] = useState<typeof blank | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [pending, setPending] = useState<File[]>([]);
  const [auto, setAuto] = useState<File[] | undefined>(undefined);

  const { data: docs = [] } = useQuery({
    queryKey: ["documents", office, filter],
    queryFn: async () => {
      let q = supabase.from("documents").select("*").order("created_at", { ascending: false }).limit(200);
      if (office) {
        q = q.eq("archived", filter.archived);
        if (filter.direction) q = q.eq("direction", filter.direction);
        if (filter.status) q = q.eq("status", filter.status);
      }
      if (filter.q) q = q.ilike("title", `%${filter.q}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as Doc[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["documents"] });

  async function save() {
    if (!form) return;
    const payload = {
      direction: form.direction, code: form.code, title: form.title.trim(), body: form.body, issuer: form.issuer,
      doc_date: form.doc_date || null, scope: form.scope, created_by: "",
    };
    let id = editId;
    const ok = await run(async () => {
      if (editId) {
        const r = await supabase.from("documents").update(payload).eq("id", editId);
        if (r.error) return r;
      } else {
        const r = await supabase.from("documents").insert({ ...payload, status: "draft" }).select("id").single();
        if (r.error) return r;
        id = r.data.id;
      }
      await supabase.from("document_recipients").delete().eq("document_id", id!);
      if (form.scope === "selected" && form.recipients.length)
        return supabase.from("document_recipients").insert(form.recipients.map((c) => ({ document_id: id!, chapter_id: c })));
      return undefined;
    }, "Đã lưu văn bản (trạng thái nháp nếu tạo mới).");
    if (!ok) return; // form stays open, nothing typed is lost
    refresh();
    if (!editId && pending.length) { setAuto(pending); setPending([]); setEditId(id); return; }
    setForm(null); setEditId(null); setAuto(undefined);
  }

  async function edit(d: Doc) {
    const { data } = await supabase.from("document_recipients").select("chapter_id").eq("document_id", d.id);
    setEditId(d.id); setAuto(undefined); setPending([]);
    setForm({ direction: d.direction, code: d.code, title: d.title, body: d.body, issuer: d.issuer, doc_date: d.doc_date ?? "", scope: d.scope, recipients: (data ?? []).map((x) => x.chapter_id) });
  }

  const setStatus = (id: string, patch: Partial<Doc>, msg: string) =>
    run(() => supabase.from("documents").update(patch).eq("id", id), msg).then(refresh);

  async function openDoc(d: Doc) {
    setOpen(open === d.id ? null : d.id);
    if (!office && !ctx.officeView && ctx.chapterId && d.scope === "selected") await supabase.rpc("mark_document_read", { _doc: d.id, _chapter: ctx.chapterId });
  }

  return (
    <Section title={office ? "Văn bản đến / đi" : "Văn bản nhận"}
      action={office && !form && <Button size="xl" onClick={() => { setEditId(null); setAuto(undefined); setPending([]); setForm({ ...blank }); }}>＋ Văn bản mới</Button>}>
      {ctx.officeView && (
        <p className="panel p-4 text-sm text-muted-foreground">
          Chế độ Văn phòng chỉ xem: xem/tải được văn bản và tệp đính kèm đã phát hành tới Chi hội này. Văn phòng không gửi thay Chi hội; cán bộ Chi hội mở liên kết Sổ riêng để gửi báo cáo kèm minh chứng.
        </p>
      )}
      {form && (
        <div className="panel space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Loại</label>
              <select className="field" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
                <option value="in">Văn bản đến</option><option value="out">Văn bản đi</option></select></div>
            <div><label className="label">Số/ký hiệu</label><input className="field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div><label className="label">Cơ quan ban hành</label><input className="field" value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} /></div>
            <div><label className="label">Ngày văn bản</label><input type="date" className="field" value={form.doc_date} onChange={(e) => setForm({ ...form, doc_date: e.target.value })} /></div>
          </div>
          <div><label className="label">Trích yếu *</label><input className="field" maxLength={300} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="label">Nội dung</label><textarea className="field" maxLength={20000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
          <div><label className="label">Phạm vi phát hành</label>
            <select className="field" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
              <option value="all">Tất cả Chi hội</option><option value="selected">Chi hội được chọn</option><option value="office">Chỉ nội bộ Văn phòng</option></select></div>
          {form.scope === "selected" && <ChapterPicker chapters={ctx.chapters} value={form.recipients} onChange={(v) => setForm({ ...form, recipients: v })} />}
          {editId ? <Attachments ownerType="document" ownerId={editId} canUpload autoFiles={auto} title="Tệp đính kèm văn bản (PDF/ảnh)" />
            : <FilePicker files={pending} onChange={setPending} />}
          <div className="flex flex-wrap gap-2">
            <Button size="xl" disabled={busy || !form.title.trim()} onClick={save}>{editId ? "Lưu thay đổi" : pending.length ? `Lưu & tải ${pending.length} tệp` : "Lưu"}</Button>
            <Button size="xl" variant="soft" onClick={() => { setForm(null); setEditId(null); setAuto(undefined); setPending([]); }}>{editId ? "Xong" : "Hủy"}</Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input className="field max-w-xs" placeholder="Tìm theo trích yếu…" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
        {office && (<>
          <select className="field max-w-[11rem]" value={filter.direction} onChange={(e) => setFilter({ ...filter, direction: e.target.value })}>
            <option value="">Đến & đi</option><option value="in">Văn bản đến</option><option value="out">Văn bản đi</option></select>
          <select className="field max-w-[11rem]" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
            <option value="">Mọi trạng thái</option>{Object.entries(DOC_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <Button variant={filter.archived ? "default" : "soft"} size="xl" onClick={() => setFilter({ ...filter, archived: !filter.archived })}>
            {filter.archived ? "Đang xem lưu trữ" : "Xem lưu trữ"}</Button>
        </>)}
      </div>

      {docs.length === 0 ? <Empty>Chưa có văn bản.</Empty> : (
        <ul className="space-y-3">
          {docs.map((d) => (
            <li key={d.id} className="panel p-4">
              <button className="w-full text-left" onClick={() => openDoc(d)}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="chip">{d.direction === "in" ? "Đến" : "Đi"}</span>
                  {office && <span className={d.status === "withdrawn" ? "chip chip-danger" : d.status === "draft" ? "chip chip-warn" : "chip chip-ok"}>{DOC_STATUS[d.status]}</span>}
                  {d.is_test && <span className="chip chip-warn">[TEST]</span>}
                  <span className="text-muted-foreground">{d.code} · {fmtDate(d.doc_date ?? d.created_at)}</span>
                </div>
                <p className="mt-1 text-base font-semibold">{d.title}</p>
              </button>
              {open === d.id && (
                <div className="mt-3 space-y-3 border-t border-border pt-3">
                  {d.issuer && <p className="text-sm text-muted-foreground">Ban hành: {d.issuer}</p>}
                  <p className="whitespace-pre-wrap text-sm">{d.body || "—"}</p>
                  <Attachments ownerType="document" ownerId={d.id} canUpload={false} />
                  {office && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="soft" size="xl" onClick={() => edit(d)}>Sửa</Button>
                      {d.status !== "published" && <Button size="xl" onClick={() => setStatus(d.id, { status: "published" }, "Đã phát hành.")}>Phát hành</Button>}
                      {d.status === "published" && <Button variant="destructive" size="xl" onClick={() => confirm("Thu hồi văn bản? Chi hội sẽ không còn đọc được nội dung.") && setStatus(d.id, { status: "withdrawn" }, "Đã thu hồi.")}>Thu hồi</Button>}
                      <Button variant="soft" size="xl" onClick={() => setStatus(d.id, { archived: !d.archived }, d.archived ? "Đã khôi phục." : "Đã lưu trữ.")}>{d.archived ? "Khôi phục" : "Lưu trữ"}</Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
