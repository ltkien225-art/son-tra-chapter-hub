import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { fmtDateTime, viError } from "@/lib/hoi";
import { hashToken } from "@/lib/link-token";
import { issueHandover } from "@/lib/links.functions";
import { Section } from "./common";

type CodeStatus = { active: boolean; updated_at: string; last_used_at: string | null };
type Invite = { id: string; label: string; active: boolean; used_at: string | null; expires_at: string; created_at: string };

/** Admin: set / change / revoke the shared office protection code. Only the SHA-256 hash leaves the device. */
export function OfficeCodePanel() {
  const qc = useQueryClient();
  const [c1, setC1] = useState("");
  const [c2, setC2] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: status } = useQuery({
    queryKey: ["office-code"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("office_code_status");
      if (error) throw error;
      return ((data as CodeStatus[] | null) ?? [])[0] ?? null;
    },
  });
  async function save() {
    const code = c1.trim();
    if (code.length < 6 || code.length > 40) { toast.error("Mã gồm 6–40 ký tự"); return; }
    if (code !== c2.trim()) { toast.error("Hai lần nhập mã không giống nhau"); return; }
    if (!confirm("Đặt/đổi mã bảo vệ Văn phòng? Mã cũ (nếu có) ngừng hoạt động ngay.")) return;
    setBusy(true);
    const { error } = await supabase.rpc("set_office_code", { p_code_hash: await hashToken(code) });
    setBusy(false);
    if (error) { toast.error(viError(error)); return; }
    toast.success("Đã đặt mã bảo vệ Văn phòng. Ghi lại và gửi kín cho cán bộ Văn phòng.");
    setC1(""); setC2("");
    qc.invalidateQueries({ queryKey: ["office-code"] });
  }
  async function revoke() {
    const reason = prompt("Lý do thu hồi mã Văn phòng?");
    if (!reason?.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("revoke_office_code", { p_reason: reason });
    setBusy(false);
    if (error) { toast.error(viError(error)); return; }
    toast.success("Đã thu hồi mã. Mọi máy đang mở bằng mã mất quyền ở thao tác kế tiếp.");
    qc.invalidateQueries({ queryKey: ["office-code"] });
  }
  return (
    <Section title="Mã bảo vệ Văn phòng (/van-phong)">
      <div className="panel space-y-3 p-4 text-sm">
        <p>
          Cán bộ Văn phòng mở <b>/van-phong</b> bằng mã này, không cần email. Mã được lưu dạng băm một chiều; hệ thống không lưu mã thô.{" "}
          {status?.active
            ? <>Trạng thái: <b>đang hoạt động</b> · đặt lúc {fmtDateTime(status.updated_at)}{status.last_used_at ? ` · dùng gần nhất ${fmtDateTime(status.last_used_at)}` : " · chưa dùng"}.</>
            : <>Trạng thái: <b>chưa đặt hoặc đã thu hồi</b>.</>}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Mã mới (6–40 ký tự)</label>
            <input className="field" type="password" autoComplete="off" minLength={6} maxLength={40} value={c1} onChange={(e) => setC1(e.target.value)} /></div>
          <div><label className="label">Nhập lại mã mới</label>
            <input className="field" type="password" autoComplete="off" minLength={6} maxLength={40} value={c2} onChange={(e) => setC2(e.target.value)} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" disabled={busy || !c1 || !c2} onClick={save}>{status?.active ? "Đổi mã" : "Đặt mã"}</Button>
          {status?.active && <Button size="lg" variant="outline" disabled={busy} onClick={revoke}>Thu hồi mã</Button>}
        </div>
        <p className="text-xs text-muted-foreground">Đổi mã: máy đang mở vẫn dùng tiếp đến khi đăng xuất; máy mới phải dùng mã mới. Thu hồi mã: mọi phiên mở bằng mã mất quyền ngay. Không thu hồi được khi chính bạn đang mở bằng mã — dùng đăng nhập email quản trị dự phòng.</p>
      </div>
    </Section>
  );
}

/** Admin: issue / revoke one-time handover links (recipient sets the office code themselves). Full URL shown once. */
export function HandoverPanel() {
  const qc = useQueryClient();
  const issue = useServerFn(issueHandover);
  const [shown, setShown] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: invites = [] } = useQuery({
    queryKey: ["handover-invites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("handover_invites").select("id,label,active,used_at,expires_at,created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invite[];
    },
  });
  async function make() {
    if (busy) return;
    setBusy(true);
    try {
      const { token } = await issue({ data: { label: "Tiếp nhận quản trị", hours: 72 } });
      setShown(`${window.location.origin}/tiep-nhan#t=${token}`);
      await qc.invalidateQueries({ queryKey: ["handover-invites"] });
    } catch (e) { toast.error(viError(e)); } finally { setBusy(false); }
  }
  async function revoke(i: Invite) {
    const reason = prompt("Lý do thu hồi liên kết tiếp nhận?");
    if (!reason?.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("revoke_handover_invite", { p_id: i.id, p_reason: reason });
    setBusy(false);
    if (error) toast.error(viError(error)); else { toast.success("Đã thu hồi liên kết tiếp nhận"); qc.invalidateQueries({ queryKey: ["handover-invites"] }); }
  }
  return (
    <Section title="Liên kết tiếp nhận quản trị (/tiep-nhan)">
      <div className="panel space-y-3 p-4 text-sm">
        <p>Dùng khi <b>chuyển quyền quản trị cho người mới</b> (ví dụ Chủ tịch Hội): liên kết ngẫu nhiên, chỉ dùng <b>một lần</b>, hết hạn sau 72 giờ. Người nhận mở liên kết và <b>tự đặt mã bảo vệ Văn phòng</b> — không cần email. Liên kết đầy đủ chỉ hiện một lần; gửi kín (Zalo cá nhân), không đăng nhóm.</p>
        {shown && (
          <div className="rounded-xl border-2 border-primary bg-muted p-4" role="status">
            <p className="font-bold">Liên kết tiếp nhận mới (chỉ hiện lần này)</p>
            <p className="mt-1 break-all font-mono text-sm" data-testid="new-handover-link">{shown}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="lg" onClick={() => navigator.clipboard.writeText(shown).then(() => toast.success("Đã sao chép"))}>Sao chép liên kết</Button>
              <Button size="lg" variant="ghost" onClick={() => setShown(null)}>Đã gửi xong, ẩn</Button>
            </div>
          </div>
        )}
        <Button size="lg" disabled={busy} onClick={make}>Cấp liên kết tiếp nhận mới</Button>
        <ul className="divide-y divide-border">
          {invites.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div><b>{i.label || "Tiếp nhận quản trị"}</b>
                <p className="text-sm text-muted-foreground">
                  {i.used_at ? `Đã dùng ${fmtDateTime(i.used_at)}` : !i.active ? "Đã thu hồi" : new Date(i.expires_at) < new Date() ? "Đã hết hạn" : `Còn hạn tới ${fmtDateTime(i.expires_at)}`}
                  {" · tạo "}{fmtDateTime(i.created_at)}
                </p>
              </div>
              {!i.used_at && i.active && new Date(i.expires_at) > new Date() && <Button size="lg" variant="outline" disabled={busy} onClick={() => revoke(i)}>Thu hồi</Button>}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
