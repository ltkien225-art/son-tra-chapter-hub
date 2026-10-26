import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { openChapterLink } from "@/lib/chapter-links.functions";
import { chapterTokenFromHash, CHAPTER_LINK_UNIT_RE } from "@/lib/chapter-link";
import { hashToken } from "@/lib/link-token";
import { Button } from "@/components/ui/button";
import { useHoiSession } from "@/hooks/use-hoi-session";
import { UNIT_RE, unitLabel } from "@/lib/units";
import { BrandLogo } from "@/components/hoi/BrandLogo";

export const Route = createFileRoute("/so/$unit")({
  ssr: false,
  loader: ({ params }) => {
    if (!UNIT_RE.test(params.unit)) throw notFound();
    return { unit: params.unit };
  },
  head: ({ loaderData }) => {
    const name = loaderData ? unitLabel(loaderData.unit) : "Sổ Chi hội";
    const title = `${loaderData?.unit === "office" ? name : "Sổ " + name} · Hội LHPN Sơn Trà`;
    const desc = `Lối vào riêng của ${name} — mở liên kết riêng do Văn phòng Hội cấp.`;
    return {
      meta: [
        { title }, { name: "description", content: desc }, { name: "robots", content: "noindex,nofollow" }, { name: "referrer", content: "no-referrer" },
        { property: "og:title", content: title }, { property: "og:description", content: desc },
        { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
        { name: "apple-mobile-web-app-title", content: name },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="p-10 text-center">Không tìm thấy đơn vị. <Link to="/" className="text-primary underline">Về trang đầu</Link></div>
  ),
  component: UnitEntry,
});

function UnitEntry() {
  const { unit } = Route.useLoaderData();
  const { session, ready } = useHoiSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const open = useServerFn(openChapterLink);
  const started = useRef(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current || !ready) return;
    started.current = true;
    const fragment = window.location.hash;
    const token = chapterTokenFromHash(fragment);
    if (fragment) window.history.replaceState(null, "", window.location.pathname);
    if (unit === "office") { navigate({ to: "/van-phong", replace: true }); return; }
    (async () => {
      try {
        if (fragment && !token) throw new Error("Liên kết không hợp lệ. Liên hệ Văn phòng để nhận lại link Sổ.");
        if (token) {
          const r = await open({ data: { chapter: unit, tokenHash: await hashToken(token) } });
          await qc.cancelQueries(); qc.clear();
          await supabase.auth.signOut({ scope: "local" });
          const result = await supabase.auth.setSession(r);
          if (result.error) throw new Error("Không lưu được phiên. Thử mở lại link Sổ.");
          navigate({ to: "/app", replace: true });
        } else if (session && CHAPTER_LINK_UNIT_RE.test(unit)) {
          const result = await supabase.rpc("my_access");
          const access = result.data as { office?: boolean; chapters?: string[] } | null;
          if (result.error || access?.office || !access?.chapters?.includes(unit)) throw new Error("Hãy mở liên kết riêng của Chi hội do Văn phòng gửi. Lối vào chung không cấp quyền Sổ.");
          navigate({ to: "/app", replace: true });
        }
      } catch (e) { setError(e instanceof Error ? e.message : "Không mở được Sổ. Thử mở lại liên kết hoặc liên hệ Văn phòng."); }
      finally { setChecking(false); }
    })();
  }, [ready, session, unit, open, navigate, qc]);
  return (
    <div className="min-h-screen bg-background">
      <header className="hero-lotus px-5 py-8">
        <div className="mx-auto max-w-md">
          <BrandLogo />
          <p className="text-xs font-semibold tracking-[0.18em] opacity-90">HỘI LHPN PHƯỜNG SƠN TRÀ</p>
          <h1 className="mt-2 text-2xl font-bold">{unit === "office" ? "Văn phòng Hội" : `Sổ ${unitLabel(unit)}`}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-md space-y-4 px-5 py-6">
        <section className="space-y-4 p-5">
          {checking ? <p role="status">Đang mở Sổ Chi hội…</p> : <>
            <h2 className="text-lg font-bold text-primary">Mở Sổ bằng liên kết riêng</h2>
            <p className="text-sm">Mở nguyên liên kết Văn phòng gửi riêng qua Zalo để vào đúng Sổ. Không cần email, mật khẩu hay mã truy cập. Liên kết dùng được trên nhiều thiết bị.</p>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <p className="text-sm text-muted-foreground">Chưa có link hoặc link bị thu hồi: liên hệ Văn phòng Hội. Nếu đang mở trong Zalo, chọn mở bằng Safari hoặc Chrome và giữ nguyên liên kết đầy đủ.</p>
            {session && <Button variant="outline" onClick={() => navigate({ to: "/app" })}>Về không gian đang đăng nhập</Button>}
          </>}
        </section>
        <p className="panel p-4 text-sm text-muted-foreground">
          Mẹo: sau khi vào được, trên iPhone bấm nút Chia sẻ → “Thêm vào MH chính”; trên Android bấm ⋮ → “Thêm vào màn hình chính” để lần sau mở nhanh.
        </p>
        <Link to="/" className="block text-center text-sm text-primary underline">Chọn đơn vị khác</Link>
      </main>
    </div>
  );
}
