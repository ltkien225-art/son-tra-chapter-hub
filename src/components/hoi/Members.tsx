import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv, fmtDateTime, fmtNum, thisPeriod } from "@/lib/hoi";
import { Empty, Section, useAction, type Ctx } from "./common";

type Sum = { chapter_id: string; name: string; households: number | null; period: string | null; members_total: number | null; members_new: number | null; members_left: number | null; submissions_count: number; open_tasks: number; overdue_tasks: number };

export function useSummary(period: string | null) {
  return useQuery({
    queryKey: ["summary", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("office_summary", { _period: period as string });
      if (error) throw error;
      return data as Sum[];
    },
  });
}

export function Members({ ctx }: { ctx: Ctx }) {
  return ctx.access.office ? <OfficeMembers ctx={ctx} /> : <ChapterMembers ctx={ctx} />;
}

function OfficeMembers({ ctx }: { ctx: Ctx }) {
  const [period, setPeriod] = useState("");
  const { data = [] } = useSummary(period || null);
  const reported = data.filter((r) => r.members_total != null);
  const total = reported.reduce((s, r) => s + (r.members_total ?? 0), 0);
  return (
    <Section title="Hội viên theo kỳ"
      action={<Button size="xl" variant="soft" onClick={() => downloadCsv(`hoi-vien-${period || "moi-nhat"}.csv`, [["Chi hội", "Số hộ (danh sách)", "Kỳ", "Tổng hội viên", "Kết nạp mới", "Giảm"], ...data.map((r) => [r.name, r.households, r.period, r.members_total, r.members_new, r.members_left])])}>Xuất CSV</Button>}>
      <div className="flex flex-wrap items-end gap-3">
        <div><label className="label">Kỳ</label><input type="month" className="field" value={period} onChange={(e) => setPeriod(e.target.value)} /></div>
        {period && <Button variant="soft" size="xl" onClick={() => setPeriod("")}>Kỳ mới nhất từng Chi hội</Button>}
      </div>
      <p className="panel p-4 text-sm">
        {reported.length}/{ctx.chapters.length} Chi hội đã cập nhật · Tổng hội viên đã báo cáo: <b>{fmtNum(total)}</b>.
        <span className="block text-muted-foreground">Số hộ là số liệu dân cư theo danh sách, không phải số hội viên. Chi hội chưa cập nhật hiển thị “—”, không tự điền.</span>
      </p>
      <div className="panel overflow-auto"><table className="tbl">
        <thead><tr><th>Chi hội</th><th>Số hộ</th><th>Kỳ</th><th>Hội viên</th><th>Mới</th><th>Giảm</th></tr></thead>
        <tbody>{data.map((r) => (<tr key={r.chapter_id}><td>{r.name}</td><td>{fmtNum(r.households)}</td><td>{r.period ?? "—"}</td><td className="font-semibold">{fmtNum(r.members_total)}</td><td>{fmtNum(r.members_new)}</td><td>{fmtNum(r.members_left)}</td></tr>))}</tbody>
      </table></div>
    </Section>
  );
}

function ChapterMembers({ ctx }: { ctx: Ctx }) {
  const qc = useQueryClient();
  const { busy, run } = useAction();
  const [f, setF] = useState({ period: thisPeriod(), members_total: "", members_new: "0", members_left: "0" });
  const { data = [] } = useQuery({
    queryKey: ["member_counts", ctx.chapterId],
    enabled: !!ctx.chapterId,
    queryFn: async () => {
      const { data, error } = await supabase.from("member_counts").select("*").eq("chapter_id", ctx.chapterId!).order("period", { ascending: false }).limit(36);
      if (error) throw error;
      return data;
    },
  });
  const valid = [f.members_total, f.members_new, f.members_left].every((v) => /^\d+$/.test(v));
  return (
    <Section title="Cập nhật hội viên theo kỳ">
      <div className="panel space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-4">
          <div><label className="label">Kỳ</label><input type="month" className="field" value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} /></div>
          <div><label className="label">Tổng hội viên</label><input inputMode="numeric" className="field" value={f.members_total} onChange={(e) => setF({ ...f, members_total: e.target.value })} /></div>
          <div><label className="label">Kết nạp mới</label><input inputMode="numeric" className="field" value={f.members_new} onChange={(e) => setF({ ...f, members_new: e.target.value })} /></div>
          <div><label className="label">Giảm</label><input inputMode="numeric" className="field" value={f.members_left} onChange={(e) => setF({ ...f, members_left: e.target.value })} /></div>
        </div>
        <Button size="xl" disabled={busy || !valid || !f.period} onClick={() => run(() => supabase.from("member_counts").upsert({
          chapter_id: ctx.chapterId!, period: f.period, members_total: +f.members_total, members_new: +f.members_new, members_left: +f.members_left, updated_by: "",
        }), "Đã lưu số liệu hội viên.").then(() => qc.invalidateQueries({ queryKey: ["member_counts"] }))}>Lưu</Button>
      </div>
      {data.length === 0 ? <Empty>Chưa có số liệu.</Empty> : (
        <div className="panel overflow-auto"><table className="tbl">
          <thead><tr><th>Kỳ</th><th>Tổng</th><th>Mới</th><th>Giảm</th><th>Cập nhật</th></tr></thead>
          <tbody>{data.map((r) => <tr key={r.period}><td>{r.period}</td><td className="font-semibold">{fmtNum(r.members_total)}</td><td>{r.members_new}</td><td>{r.members_left}</td><td className="text-xs">{r.updated_by}<br />{fmtDateTime(r.updated_at)}</td></tr>)}</tbody>
        </table></div>
      )}
    </Section>
  );
}
