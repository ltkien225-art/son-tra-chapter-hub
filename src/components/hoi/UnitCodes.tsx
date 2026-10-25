import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime, viError } from "@/lib/hoi";
import { revokeUnitCode, rotateUnitCode } from "@/lib/unit-login.functions";
import { CHAPTER_NAMES, unitLabel } from "@/lib/units";
import { Section } from "./common";

const UNITS = ["office", ...Object.keys(CHAPTER_NAMES)];

/** Admin: issue / change / revoke per-unit access codes. A new code is shown once and never stored in plain text. */
export function UnitCodes() {
  const qc = useQueryClient();
  const rotate = useServerFn(rotateUnitCode);
  const revoke = useServerFn(revokeUnitCode);
  const [busy, setBusy] = useState<string | null>(null);
  const [shown, setShown] = useState<{ unit: string; pin: string } | null>(null);
  const { data } = useQuery({
    queryKey: ["unit-logins"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_unit_logins");
      if (error) throw error;
      return data ?? [];
    },
  });
  const row = (u: string) => data?.find((r) => r.unit === u);
  const link = (u: string) => `${window.location.origin}/so/${u}`;

  async function doRotate(u: string) {
    if (row(u)?.enabled && !confirm(`Đổi mã của ${unitLabel(u)}? Mã cũ và mọi thiết bị đang dùng mã cũ sẽ bị đăng xuất ngay.`)) return;
    setBusy(u);
    try { const r = await rotate({ data: { unit: u } }); setShown({ unit: u, pin: r.pin }); qc.invalidateQueries({ queryKey: ["unit-logins"] }); }
    catch (e) { toast.error(viError(e)); } finally { setBusy(null); }
  }
  async function doRevoke(u: string) {
    if (!confirm(`Thu hồi mã của ${unitLabel(u)}? Mọi thiết bị của đơn vị sẽ mất quyền ngay.`)) return;
    setBusy(u);
    try { await revoke({ data: { unit: u } }); toast.success("Đã thu hồi. Có hiệu lực ngay."); qc.invalidateQueries({ queryKey: ["unit-logins"] }); }
    catch (e) { toast.error(viError(e)); } finally { setBusy(null); }
  }

  return (
    <Section title="Mã truy cập Văn phòng & 42 Chi hội">
      <div className="panel space-y-1 p-4 text-sm">
        <p>Mỗi đơn vị có <b>link riêng</b> và <b>mã 8 số riêng</b>. Link không phải là quyền: không có mã thì không vào được.</p>
        <p>Bàn giao an toàn: gửi link qua Zalo được, nhưng <b>đọc mã trực tiếp hoặc gọi điện</b> cho người phụ trách, không đăng mã lên nhóm. Mã chỉ hiện <b>một lần</b>; quên thì bấm “Đổi mã”.</p>
        <p>Mã Chi hội chỉ thấy dữ liệu Chi hội đó; mã Văn phòng là cán bộ Văn phòng (không có quyền quản trị, không xem hồ sơ nhạy cảm).</p>
      </div>
      {shown && (
        <div className="panel border-2 border-primary p-5" role="alert">
          <p className="font-bold">Mã mới của {unitLabel(shown.unit)} (chỉ hiện lần này):</p>
          <p className="my-2 select-all text-center font-mono text-3xl tracking-[0.3em]">{shown.pin}</p>
          <p className="text-sm">Link: <span className="select-all break-all">{link(shown.unit)}</span></p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(link(shown.unit)); toast.success("Đã chép link (không kèm mã)"); }}>Chép link</Button>
            <Button onClick={() => setShown(null)}>Tôi đã ghi lại mã — Ẩn</Button>
          </div>
        </div>
      )}
      <div className="grid gap-2 md:grid-cols-2">
        {UNITS.map((u) => {
          const r = row(u);
          return (
            <div key={u} className="panel flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="font-semibold">{unitLabel(u)}</p>
                <p className="text-xs text-muted-foreground">
                  {r?.enabled ? `Đang có mã · đổi lúc ${fmtDateTime(r.rotated_at)}` : r ? "Đã thu hồi" : "Chưa cấp mã"}
                  {r && Number(r.fails_15m) > 0 ? ` · ${r.fails_15m} lần nhập sai/15 phút` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={busy === u} onClick={() => doRotate(u)}>{r?.enabled ? "Đổi mã" : "Cấp mã"}</Button>
                {r?.enabled && <Button size="sm" variant="outline" disabled={busy === u} onClick={() => doRevoke(u)}>Thu hồi</Button>}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
