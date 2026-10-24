import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_EMAIL, downloadJson, fmtDateTime, viError } from "@/lib/hoi";
import { ChapterName, ChapterPicker, Empty, Pager, Section, useAction, type Ctx } from "./common";

type Grant = { email: string; office_role: string | null; sensitive: boolean; chapters: string[]; note: string };

export function AccessAdmin({ ctx }: { ctx: Ctx }) {
  const qc = useQueryClient();
  const { busy, run } = useAction();
  const [g, setG] = useState<Grant | null>(null);
  const { data } = useQuery({
    queryKey: ["access-admin"],
    queryFn: async () => {
      const [u, ca, rq] = await Promise.all([
        supabase.from("app_users").select("*").order("email"),
        supabase.from("chapter_access").select("*"),
        supabase.from("access_requests").select("*").order("created_at", { ascending: false }),
      ]);
      if (u.error || ca.error || rq.error) throw u.error || ca.error || rq.error;
      return { users: u.data, access: ca.data, requests: rq.data };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["access-admin"] });
  const chaptersOf = (email: string) => (data?.access ?? []).filter((a) => a.email === email).map((a) => a.chapter_id);
  const pending = (data?.requests ?? []).filter((r) => r.status === "pending");
  const editable = ctx.access.admin;

  async function save() {
    if (!g) return;
    const ok = await run(() => supabase.rpc("set_user_access", { _email: g.email, _office_role: g.office_role as string, _sensitive: g.sensitive, _chapters: g.chapters, _note: g.note }), "Đã cấp quyền. Có hiệu lực ngay ở thao tác tiếp theo.");
    if (ok) { setG(null); refresh(); }
  }

  return (
    <Section title="Phân quyền người dùng"
      action={editable && !g && <Button size="xl" onClick={() => setG({ email: "", office_role: null, sensitive: false, chapters: [], note: "" })}>＋ Cấp quyền email</Button>}>
      {!editable && <p className="panel p-4 text-sm">Chỉ quản trị viên được cấp/thu hồi quyền. Bạn đang xem ở chế độ chỉ đọc.</p>}
      {g && (
        <div className="panel space-y-4 p-5">
          <div><label className="label">Email *</label><input type="email" className="field" value={g.email} onChange={(e) => setG({ ...g, email: e.target.value })} /></div>
          <div><label className="label">Vai trò Văn phòng</label>
            <select className="field" value={g.office_role ?? ""} onChange={(e) => setG({ ...g, office_role: e.target.value || null })}>
              <option value="">Không (chỉ Chi hội)</option><option value="staff">Cán bộ Văn phòng</option><option value="admin">Quản trị</option></select></div>
          <label className="flex min-h-12 items-center gap-3 rounded-xl bg-warning px-3 text-sm text-warning-foreground">
            <input type="checkbox" className="size-5 accent-primary" checked={g.sensitive} onChange={(e) => setG({ ...g, sensitive: e.target.checked })} />
            Quyền đặc biệt: xem hồ sơ nhạy cảm phụ nữ/trẻ em (trong phạm vi Chi hội được gắn)
          </label>
          {!g.office_role && <div><label className="label">Gắn với Chi hội</label><ChapterPicker chapters={ctx.chapters} value={g.chapters} onChange={(v) => setG({ ...g, chapters: v })} /></div>}
          <div><label className="label">Ghi chú (chức danh)</label><input className="field" maxLength={300} value={g.note} onChange={(e) => setG({ ...g, note: e.target.value })} /></div>
          <div className="flex gap-2"><Button size="xl" disabled={busy || !g.email.includes("@")} onClick={save}>Lưu quyền</Button><Button size="xl" variant="soft" onClick={() => setG(null)}>Hủy</Button></div>
        </div>
      )}

      <h3 className="font-bold">Yêu cầu chờ duyệt ({pending.length})</h3>
      {pending.length === 0 ? <Empty>Không có yêu cầu mới.</Empty> : (
        <ul className="space-y-2">{pending.map((r) => (
          <li key={r.email} className="panel flex flex-wrap items-center justify-between gap-2 p-4">
            <div><p className="font-semibold">{r.email}</p><p className="text-sm text-muted-foreground">{r.message || "—"} · {fmtDateTime(r.created_at)}</p></div>
            {editable && <div className="flex gap-2">
              <Button size="xl" onClick={() => setG({ email: r.email, office_role: null, sensitive: false, chapters: [], note: r.message })}>Duyệt & gắn Chi hội</Button>
              <Button size="xl" variant="soft" onClick={() => run(() => supabase.from("access_requests").update({ status: "rejected" }).eq("email", r.email), "Đã từ chối.").then(refresh)}>Từ chối</Button>
            </div>}
          </li>))}</ul>
      )}

      <h3 className="font-bold">Người dùng đã cấp quyền</h3>
      <div className="panel overflow-auto"><table className="tbl">
        <thead><tr><th>Email</th><th>Vai trò</th><th>Chi hội</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>
          <tr><td>{ADMIN_EMAIL}</td><td>Quản trị chính (cố định)</td><td>Tất cả</td><td><span className="chip chip-ok">Hoạt động</span></td><td></td></tr>
          {(data?.users ?? []).map((u) => {
            const chs = chaptersOf(u.email);
            return (
              <tr key={u.email}>
                <td className="break-all">{u.email}<div className="text-xs text-muted-foreground">{u.note}</div></td>
                <td>{u.office_role === "admin" ? "Quản trị" : u.office_role === "staff" ? "Cán bộ VP" : "Chi hội"}{u.sensitive_access && <span className="chip chip-warn ml-1">Nhạy cảm</span>}</td>
                <td className="text-sm">{u.office_role ? "Tất cả" : chs.map((c) => <ChapterName key={c} id={c} chapters={ctx.chapters} />).reduce<React.ReactNode[]>((a, x, i) => (i ? [...a, ", ", x] : [x]), [])}</td>
                <td>{u.active ? <span className="chip chip-ok">Hoạt động</span> : <span className="chip chip-danger">Đã thu hồi</span>}</td>
                <td>{editable && <div className="flex gap-1">
                  <Button size="sm" variant="soft" onClick={() => setG({ email: u.email, office_role: u.office_role, sensitive: u.sensitive_access, chapters: chs, note: u.note })}>Sửa</Button>
                  {u.active && <Button size="sm" variant="destructive" onClick={() => confirm(`Thu hồi toàn bộ quyền của ${u.email}?`) && run(() => supabase.rpc("revoke_user_access", { _email: u.email }), "Đã thu hồi. Người này mất quyền ngay ở thao tác tiếp theo.").then(refresh)}>Thu hồi</Button>}
                </div>}</td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </Section>
  );
}

const AUDIT_SIZE = 50;
const ACTION_VI: Record<string, string> = { insert: "Tạo", update: "Sửa", delete: "Xóa", withdraw: "Thu hồi", archive: "Lưu trữ", restore: "Khôi phục" };
export function Audit() {
  const [page, setPage] = useState(0);
  const { data } = useQuery({
    queryKey: ["audit", page],
    queryFn: async () => {
      const { data, error, count } = await supabase.from("audit_log").select("*", { count: "exact" }).order("at", { ascending: false }).range(page * AUDIT_SIZE, page * AUDIT_SIZE + AUDIT_SIZE - 1);
      if (error) throw error;
      return { rows: data, count: count ?? 0 };
    },
  });
  return (
    <Section title="Nhật ký thay đổi">
      <p className="text-sm text-muted-foreground">Ghi người thực hiện, thao tác và mã đối tượng; không ghi nội dung văn bản hay hồ sơ.</p>
      <div className="panel overflow-auto"><table className="tbl">
        <thead><tr><th>Thời gian</th><th>Người</th><th>Thao tác</th><th>Đối tượng</th></tr></thead>
        <tbody>{(data?.rows ?? []).map((r) => (
          <tr key={r.id}><td className="whitespace-nowrap text-xs">{fmtDateTime(r.at)}</td><td className="break-all text-xs">{r.actor}</td>
            <td>{r.action.startsWith("status:") ? "Đổi trạng thái → " + r.action.slice(7) : ACTION_VI[r.action] ?? r.action}</td>
            <td className="text-xs">{r.resource_type}{r.chapter_id ? ` · ${r.chapter_id}` : ""}<br /><span className="text-muted-foreground">{r.resource_id.slice(0, 40)}</span></td></tr>))}</tbody>
      </table></div>
      <Pager page={page} total={data?.count ?? 0} size={AUDIT_SIZE} onPage={setPage} />
    </Section>
  );
}

export function Backup() {
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<unknown>(null);
  const [report, setReport] = useState<string | null>(null);

  async function exportNow() {
    setBusy(true);
    const { data, error } = await supabase.rpc("export_backup");
    setBusy(false);
    if (error) { toast.error(viError(error)); return; }
    downloadJson(`sao-luu-hoi-lhpn-son-tra-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`, data);
    toast.success("Đã tải tệp sao lưu. Cất giữ an toàn, không chia sẻ công khai.");
  }

  async function restore(dry: boolean) {
    setBusy(true);
    setReport(null);
    const { data, error } = await supabase.rpc("restore_backup", { _b: file as never, _dry_run: dry });
    setBusy(false);
    if (error) {
      if (error.message.startsWith("DRY_RUN:")) { setReport("Kiểm tra thử (chưa ghi gì): sẽ thêm " + error.message.slice(8)); return; }
      { toast.error(viError(error)); return; }
    }
    setReport("Đã khôi phục, số dòng thêm mới: " + JSON.stringify(data));
  }

  return (
    <Section title="Sao lưu & khôi phục">
      <div className="panel space-y-3 p-5">
        <h3 className="font-bold">Sao lưu</h3>
        <p className="text-sm text-muted-foreground">Gồm danh mục Chi hội, văn bản, nhiệm vụ, báo cáo, hội viên. Không gồm hồ sơ nhạy cảm và tệp đính kèm.</p>
        <Button size="xl" disabled={busy} onClick={exportNow}>Tải tệp sao lưu</Button>
      </div>
      <div className="panel space-y-3 p-5">
        <h3 className="font-bold">Khôi phục an toàn</h3>
        <p className="text-sm text-muted-foreground">Chỉ thêm các dòng còn thiếu, không xóa hay ghi đè dữ liệu hiện có. Từ chối nếu danh mục 42 Chi hội không khớp. Luôn chạy “Kiểm tra thử” trước.</p>
        <input type="file" accept="application/json" className="field" onChange={async (e) => {
          const f = e.target.files?.[0]; setReport(null);
          if (!f) { setFile(null); return; }
          try { setFile(JSON.parse(await f.text())); } catch { toast.error("Tệp không phải JSON hợp lệ."); setFile(null); }
        }} />
        <div className="flex flex-wrap gap-2">
          <Button size="xl" variant="soft" disabled={busy || !file} onClick={() => restore(true)}>Kiểm tra thử</Button>
          <Button size="xl" disabled={busy || !file} onClick={() => confirm("Khôi phục thật? Chỉ thêm dòng còn thiếu.") && restore(false)}>Khôi phục</Button>
        </div>
        {report && <p className="rounded-xl bg-secondary p-3 text-sm">{report}</p>}
      </div>
    </Section>
  );
}
