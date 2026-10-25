import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useHoiSession } from "@/hooks/use-hoi-session";
import { openOfficeCode } from "@/lib/links.functions";
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
    ],
  }),
  component: OfficeGate,
});

/** /van-phong is public at the route level: without a session it shows the office-code gate (no email). Data access stays server-enforced. */
function OfficeGate() {
  const { session, ready } = useHoiSession();
  const navigate = useNavigate();
  const open = useServerFn(openOfficeCode);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (ready && session) navigate({ to: "/app" }); }, [ready, session, navigate]);

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
        <Link to="/" className="block text-center text-sm text-primary underline">Về trang đầu</Link>
      </main>
    </div>
  );
}
