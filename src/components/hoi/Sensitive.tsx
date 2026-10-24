import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CASE_CATEGORY, CASE_STATUS, fmtDateTime } from "@/lib/hoi";
import { Attachments } from "./Attachments";
import { ChapterName, Empty, Section, useAction, type Ctx } from "./common";

export function Sensitive({ ctx }: { ctx: Ctx }) {
  const qc = useQueryClient();
  const { busy, run } = useAction();
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ chapter_id: ctx.chapterId ?? ctx.chapters[0]?.id ?? "", category: "other", summary: "", details: "" });
  const { data = [] } = useQuery({
    queryKey: ["sensitive"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sensitive_cases").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["sensitive"] });
  return (
    <Section title="Hồ sơ hỗ trợ phụ nữ, trẻ em (bảo mật)">
      <p className="rounded-xl bg-warning p-3 text-sm text-warning-foreground">
        Chỉ người được Văn phòng cấp quyền đặc biệt mới xem được mục này. Không sao chép, chụp màn hình hoặc chia sẻ ra ngoài. Nhật ký chỉ ghi mã hồ sơ, không ghi nội dung.
      </p>
      <div className="panel space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Chi hội</label>
            <select className="field" value={form.chapter_id} onChange={(e) => setForm({ ...form, chapter_id: e.target.value })}>
              {ctx.chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label">Nhóm</label>
            <select className="field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(CASE_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
        <div><label className="label">Tóm tắt (không ghi họ tên đầy đủ) *</label><input className="field" maxLength={300} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
        <div><label className="label">Chi tiết</label><textarea className="field" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} /></div>
        <Button size="xl" disabled={busy || !form.summary.trim() || !form.chapter_id}
          onClick={() => run(() => supabase.from("sensitive_cases").insert({ ...form, summary: form.summary.trim(), created_by: "" }), "Đã lưu hồ sơ.").then((ok) => { if (ok) { setForm({ ...form, summary: "", details: "" }); refresh(); } })}>Lưu hồ sơ</Button>
      </div>
      {data.length === 0 ? <Empty>Chưa có hồ sơ.</Empty> : (
        <ul className="space-y-3">{data.map((c) => (
          <li key={c.id} className="panel p-4">
            <button className="w-full text-left" onClick={() => setOpen(open === c.id ? null : c.id)}>
              <div className="flex flex-wrap gap-2 text-xs"><span className="chip">{CASE_CATEGORY[c.category]}</span><span className="chip chip-warn">{CASE_STATUS[c.status]}</span>
                <span className="font-semibold"><ChapterName id={c.chapter_id} chapters={ctx.chapters} /></span><span className="text-muted-foreground">{fmtDateTime(c.created_at)}</span></div>
              <p className="mt-1 font-semibold">{c.summary}</p>
            </button>
            {open === c.id && (
              <div className="mt-3 space-y-3 border-t border-border pt-3">
                <p className="whitespace-pre-wrap text-sm">{c.details || "—"}</p>
                <div className="flex flex-wrap gap-2">{Object.entries(CASE_STATUS).map(([k, v]) => (
                  <Button key={k} size="xl" variant={c.status === k ? "default" : "soft"} onClick={() => run(() => supabase.from("sensitive_cases").update({ status: k }).eq("id", c.id), "Đã cập nhật.").then(refresh)}>{v}</Button>))}</div>
                <Attachments ownerType="sensitive_case" ownerId={c.id} canUpload />
              </div>
            )}
          </li>))}</ul>
      )}
    </Section>
  );
}
