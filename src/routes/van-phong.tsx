import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useHoiSession } from "@/hooks/use-hoi-session";
import { openOfficeCode, openOfficeDailyLink } from "@/lib/links.functions";
import { dailyTokenFromHash } from "@/lib/office-link";
import { hashToken } from "@/lib/link-token";
import { useQueryClient } from "@tanstack/react-query";
import { viError } from "@/lib/hoi";
import { BrandLogo } from "@/components/hoi/BrandLogo";

export const Route = createFileRoute("/van-phong")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Văn phòng Hội LHPN phường Sơn Trà" },
      { name: "description", content: "Mở Văn phòng Hội bằng mã bảo vệ — không cần email." },
      { property: "og:title", content: "Văn phòng Hội LHPN phường Sơn Trà" },
      { property: "og:description", content: "Mở Văn phòng Hội bằng mã bảo vệ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: OfficeGate,
});

/** /van-phong is public at the route level: without a session it shows the office-code gate (no email). Data access stays server-enforced. */
function OfficeGate() {
  const { session, ready } = useHoiSession();
  const navigate = useNavigate();
  const open = useServerFn(openOfficeCode);
  const openDaily = useServerFn(openOfficeDailyLink);
  const qc = useQueryClient();
  const started = useRef(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = window.location.hash;
    const token = dailyTokenFromHash(fragment);
    if (fragment.startsWith("#k=")) window.history.replaceState(null, "", window.location.pathname);
    if (!token) {
      if (fragment.startsWith("#k=")) setErr("Liên kết không hợp lệ hoặc đã bị thu hồi.");
      setCheckingLink(false); return;
    }
    setBusy(true);
    (async () => {
      try {
        const r = await openDaily({ data: { tokenHash: await hashToken(token) } });
        await qc.cancelQueries(); qc.clear();
        await supabase.auth.signOut({ scope: "local" });
        const { error } = await supabase.auth.verifyOtp({ token_hash: r.tokenHash, type: "magiclink" });
        if (error) throw new Error("Không mở được phiên Văn phòng. Thử mở lại link.");
        navigate({ to: "/app" });
      } catch { setErr("Liên kết không hợp lệ, đã bị thu hồi hoặc hệ thống tạm lỗi. Liên hệ người cấp link."); }
      finally { setBusy(false); setCheckingLink(false); }
    })();
  }, [openDaily, navigate, qc]);
  useEffect(() => { if (ready && session && !checkingLink && !err) navigate({ to: "/app" }); }, [ready, session, checkingLink, err, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await supabase.auth.signOut({ scope: "local" });
      const { tokenHash } = await open({ data: { code } });
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
      if (error) throw error;
      setCode(""); // session change switches to the workspace
    } catch (x) {
      setErr(viError(x));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="hero-lotus px-5 py-8">
        <div className="mx-auto max-w-md">
          <BrandLogo />
          <p className="text-xs font-semibold tracking-[0.18em] opacity-90">HỘI LHPN PHƯỜNG SƠN TRÀ</p>
          <h1 className="mt-2 text-2xl font-bold">Văn phòng Hội</h1>
        </div>
      </header>
      <main className="mx-auto max-w-md space-y-4 px-5 py-6">
        {checkingLink ? <p role="status">Đang mở Văn phòng…</p> : <>
        <section className="panel p-5">
          <h2 className="text-lg font-bold text-primary">Nhập mã bảo vệ Văn phòng</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cán bộ Văn phòng nhập <b>mã bảo vệ</b> do quản trị cấp — không cần email. Mã dùng chung cho máy Văn phòng; không chia sẻ ra ngoài.
          </p>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="office-code">Mã bảo vệ</label>
              <input id="office-code" className="field text-center text-2xl tracking-[0.3em]" type="password" autoComplete="off" required minLength={6} maxLength={40} autoFocus
                value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <Button type="submit" size="xl" className="w-full" disabled={busy}>{busy ? "Đang mở…" : "Mở Văn phòng"}</Button>
            {err && <p className="rounded-xl bg-secondary p-3 text-sm text-secondary-foreground" role="alert">{err}</p>}
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            Sai mã nhiều lần sẽ bị khóa tạm 15 phút. Chưa có mã hoặc mã bị thu hồi: liên hệ quản trị. <b>Lần đầu tiếp nhận hệ thống:</b> mở liên kết tiếp nhận do người bàn giao gửi để tự đặt mã. Chi hội mở bằng liên kết riêng đã nhận, không dùng mã này.
          </p>
        </section>
        <Link to="/cap-link-van-phong" className="block text-center font-semibold text-primary underline">Chủ sở hữu: xác minh để cấp link dùng chung</Link>
        <Link to="/" className="block text-center text-sm text-primary underline">Về trang đầu</Link>
        </>}
      </main>
    </div>
  );
}
