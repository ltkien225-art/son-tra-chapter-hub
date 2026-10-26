import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/hoi/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { useHoiSession } from "@/hooks/use-hoi-session";
import { OFFICE_OWNER, ownerVerificationOptions } from "@/lib/office-link";
import { issueOfficeDailyLink, officeLinkStatus, revokeOfficeDailyLink } from "@/lib/links.functions";
import { viError, fmtDateTime } from "@/lib/hoi";

export const Route = createFileRoute("/cap-link-van-phong")({
  head: () => ({ meta: [
    { title: "Cấp link Văn phòng · Hội LHPN Sơn Trà" },
    { name: "description", content: "Chủ sở hữu xác minh email để cấp và thu hồi liên kết Văn phòng dùng chung." },
    { property: "og:title", content: "Cấp link Văn phòng · Hội LHPN Sơn Trà" },
    { property: "og:description", content: "Xác minh chủ sở hữu và quản lý liên kết Văn phòng riêng." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex,nofollow" }, { name: "referrer", content: "no-referrer" },
  ] }),
  component: IssuePage,
});

type Status = { id: string; label: string; active: boolean; created_at: string; revoked_at: string | null };
function IssuePage() {
  const { session, ready } = useHoiSession();
  const qc = useQueryClient();
  const status = useServerFn(officeLinkStatus);
  const issue = useServerFn(issueOfficeDailyLink);
  const revoke = useServerFn(revokeOfficeDailyLink);
  const [rows, setRows] = useState<Status[]>([]);
  const [shown, setShown] = useState<{ id: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const owner = session?.user.email?.toLowerCase() === OFFICE_OWNER;
  useEffect(() => {
    setShown(null); setRows([]);
    let cancelled = false;
    if (ready && owner) status().then((r) => { if (!cancelled) setRows(r); }).catch(() => { if (!cancelled) setMsg("Không xác nhận được quyền cấp link. Thử tải lại trang."); });
    return () => { cancelled = true; };
  }, [ready, owner, session?.user.id, status]);

  async function verify() {
    setBusy(true); setMsg("");
    try {
      const { error } = await supabase.auth.signInWithOtp(ownerVerificationOptions(window.location.origin));
      if (error) throw error;
      setMsg("Đã yêu cầu gửi thư xác minh đến email chủ sở hữu. Mở liên kết trong thư để trở lại trang này; kiểm tra cả thư rác.");
    } catch { setMsg("Chưa gửi được thư xác minh. Vui lòng chờ rồi thử lại; tài khoản phải đã tồn tại."); }
    finally { setBusy(false); }
  }
  async function make() {
    if (busy) return;
    setBusy(true); setMsg("");
    try {
      const r = await issue();
      setShown({ id: r.id, url: `${window.location.origin}/van-phong#k=${r.token}` });
      setRows(await status());
    } catch (e) { setMsg(viError(e)); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!confirm("Thu hồi link này và quyền Văn phòng của mọi máy đã mở bằng link?")) return;
    setBusy(true);
    try { await revoke({ data: { id } }); if (shown?.id === id) setShown(null); setRows(await status()); setMsg("Đã thu hồi. Mọi phiên của link mất quyền ở yêu cầu kế tiếp."); }
    catch (e) { setMsg(viError(e)); } finally { setBusy(false); }
  }
  async function signOut() {
    setShown(null); setRows([]); await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut({ scope: "local" });
  }
  return <div className="min-h-screen bg-background">
    <header className="hero-lotus px-5 py-8"><div className="mx-auto max-w-xl"><BrandLogo /><h1 className="mt-3 text-2xl font-bold">Cấp link Văn phòng Hội</h1></div></header>
    <main className="mx-auto max-w-xl space-y-5 px-5 py-6">
      {!ready ? <p role="status">Đang kiểm tra phiên…</p> : !owner ? <>
        <h2 className="text-lg font-bold text-primary">Xác minh chủ sở hữu</h2>
        <p className="text-sm">Email cấp link: <b className="break-all">{OFFICE_OWNER}</b>. Không cần mật khẩu; thư chỉ được gửi khi bấm nút dưới đây.</p>
        {session && <p role="alert" className="text-sm text-destructive">Phiên hiện tại không có quyền cấp link Văn phòng.</p>}
        <Button size="xl" className="w-full" disabled={busy} onClick={verify}>{busy ? "Đang gửi…" : "Xác minh để cấp link"}</Button>
      </> : <>
        <p className="text-sm">Đã xác minh chủ sở hữu. Link dùng được đồng thời trên nhiều điện thoại và laptop, không cần mã hay email cho người nhận.</p>
        <p className="text-sm text-muted-foreground">Ai có link sẽ có quyền Văn phòng và quản lý Sổ Chi hội; gửi kín. Không tự hết hạn — dùng đến khi thu hồi. Link đầy đủ chỉ hiện trong lần cấp này.</p>
        <Button size="xl" className="w-full" disabled={busy} onClick={make}><Link2 />{busy ? "Đang xử lý…" : "Cấp một link dùng chung"}</Button>
        {shown && <section className="space-y-3 rounded-lg border border-primary p-4">
          <p className="break-all text-sm" data-testid="office-daily-link">{shown.url}</p>
          <Button size="xl" className="w-full" onClick={async () => { try { await navigator.clipboard.writeText(shown.url); setMsg("Đã sao chép link gửi Zalo."); } catch { setMsg("Chưa sao chép được. Nhấn giữ link phía trên để sao chép."); } }}><Copy />Sao chép link gửi Zalo</Button>
          <Button variant="ghost" onClick={() => setShown(null)}>Đã gửi xong, ẩn link</Button>
        </section>}
        <section><h2 className="font-bold text-primary">Các link đã cấp</h2><ul className="divide-y divide-border">{rows.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="text-sm"><b>{r.label}</b><p>{fmtDateTime(r.created_at)} · {r.active ? "Đang hoạt động" : "Đã thu hồi"}</p></div>{r.active && <Button variant="outline" disabled={busy} onClick={() => remove(r.id)}>Thu hồi</Button>}</li>)}</ul></section>
      </>}
      {msg && <p role="status" className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">{msg}</p>}
      {session && <Button variant="outline" onClick={signOut}>Đăng xuất riêng máy này</Button>}
      <Link to="/van-phong" className="block text-center text-primary underline">Mở Văn phòng Hội</Link>
    </main>
  </div>;
}