import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { openHandover } from "@/lib/links.functions";
import { hashToken, tokenFromHash } from "@/lib/link-token";
import { viError } from "@/lib/hoi";

export const Route = createFileRoute("/tiep-nhan")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Tiếp nhận quản trị — Hội LHPN phường Sơn Trà" },
      { name: "description", content: "Liên kết tiếp nhận một lần dành cho người phụ trách Hội LHPN phường Sơn Trà." },
      { property: "og:title", content: "Tiếp nhận quản trị — Hội LHPN phường Sơn Trà" },
      { property: "og:description", content: "Liên kết tiếp nhận một lần, có hạn dùng." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: Handover,
});

/** One-time handover: open the link → set the office protection code yourself → manage the office. No email. */
function Handover() {
  const navigate = useNavigate();
  const exchange = useServerFn(openHandover);
  const [state, setState] = useState<"working" | "setup" | "error">("working");
  const [msg, setMsg] = useState("");
  const [hash, setHash] = useState<string | null>(null);
  const [c1, setC1] = useState("");
  const [c2, setC2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const on = () => setHash(window.location.hash);
    on();
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  useEffect(() => {
    if (hash === null) return;
    let cancelled = false;
    const token = tokenFromHash(hash);
    setState("working"); setMsg("");
    if (!token) { setState("error"); setMsg("Liên kết thiếu mã. Hãy mở đúng liên kết tiếp nhận người bàn giao gửi."); return; }
    (async () => {
      try {
        await supabase.auth.signOut({ scope: "local" });
        const { tokenHash } = await exchange({ data: { token } });
        if (cancelled) return;
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
        if (error) throw error;
        if (cancelled) return;
        history.replaceState(null, "", "/tiep-nhan");
        setState("setup");
      } catch (e) {
        if (cancelled) return;
        await supabase.auth.signOut({ scope: "local" });
        setState("error"); setMsg(viError(e));
      }
    })();
    return () => { cancelled = true; };
  }, [hash, exchange]);

  async function setCode(e: FormEvent) {
    e.preventDefault();
    const code = c1.trim();
    if (code.length < 6 || code.length > 40) { toast.error("Mã gồm 6–40 ký tự"); return; }
    if (code !== c2.trim()) { toast.error("Hai lần nhập mã không giống nhau"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("set_office_code", { p_code_hash: await hashToken(code) });
    setBusy(false);
    if (error) { toast.error(viError(error)); return; }
    toast.success("Đã đặt mã bảo vệ Văn phòng. Ghi lại cẩn thận — hệ thống không lưu mã thô.");
    navigate({ to: "/app" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="hero-lotus px-5 py-8">
        <div className="mx-auto max-w-md">
          <p className="text-xs font-semibold tracking-[0.18em] opacity-90">HỘI LHPN PHƯỜNG SƠN TRÀ</p>
          <h1 className="mt-2 text-2xl font-bold">✿ Tiếp nhận quản trị</h1>
        </div>
      </header>
      <main className="mx-auto max-w-md space-y-4 px-5 py-6">
        {state === "working" && <p className="panel p-6 text-center text-muted-foreground">Đang kiểm tra liên kết tiếp nhận…</p>}
        {state === "error" && (
          <section className="panel space-y-3 p-5" role="alert">
            <p className="font-semibold">{msg}</p>
            <p className="text-sm text-muted-foreground">Liên kết tiếp nhận chỉ dùng được một lần và có hạn. Liên hệ người bàn giao để nhận liên kết mới.</p>
            <Link to="/" className="block text-center text-sm text-primary underline">Về trang đầu</Link>
          </section>
        )}
        {state === "setup" && (
          <section className="panel p-5">
            <h2 className="text-lg font-bold text-primary">Đặt mã bảo vệ Văn phòng</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Bạn là người tiếp nhận quản trị. Hãy <b>tự đặt mã bảo vệ</b> cho Văn phòng — cán bộ sẽ mở <b>/van-phong</b> bằng mã này, không cần email. Ghi lại và giữ kín; hệ thống chỉ lưu dạng băm một chiều, không xem lại được.
            </p>
            <form onSubmit={setCode} className="mt-4 space-y-4">
              <div>
                <label className="label" htmlFor="c1">Mã mới (6–40 ký tự)</label>
                <input id="c1" className="field" type="password" autoComplete="off" required minLength={6} maxLength={40} value={c1} onChange={(e) => setC1(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="c2">Nhập lại mã mới</label>
                <input id="c2" className="field" type="password" autoComplete="off" required minLength={6} maxLength={40} value={c2} onChange={(e) => setC2(e.target.value)} />
              </div>
              <Button type="submit" size="xl" className="w-full" disabled={busy || !c1 || !c2}>{busy ? "Đang lưu…" : "Đặt mã và vào Văn phòng"}</Button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
