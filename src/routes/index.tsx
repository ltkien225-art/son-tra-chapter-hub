import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useHoiSession } from "@/hooks/use-hoi-session";
import { viError } from "@/lib/hoi";
import { CHAPTER_NAMES } from "@/lib/units";
import { BrandLogo } from "@/components/hoi/BrandLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hội LHPN phường Sơn Trà · Văn phòng & Sổ Chi hội" },
      { name: "description", content: "Bộ công cụ số của Hội Liên hiệp Phụ nữ phường Sơn Trà: Văn phòng Hội và Sổ 42 Chi hội." },
      { property: "og:title", content: "Hội LHPN phường Sơn Trà · Văn phòng & Sổ Chi hội" },
      { property: "og:description", content: "Kết nối Chi hội · Đồng hành cùng phụ nữ · Điều hành hiệu quả." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, ready } = useHoiSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [unit, setUnit] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (ready && session) navigate({ to: "/app" });
  }, [ready, session, navigate]);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return setMsg(viError(error));
    setStep("code");
    setMsg("Đã gửi email. Nhập mã số trong thư, hoặc bấm vào liên kết trong thư trên cùng thiết bị này.");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) return setMsg("Mã không đúng hoặc đã hết hạn. Vui lòng thử lại.");
    navigate({ to: "/app" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="hero-lotus px-5 py-10 md:py-14">
        <div className="mx-auto max-w-5xl">
          <BrandLogo />
          <p className="text-xs font-semibold tracking-[0.18em] opacity-90">HỘI LIÊN HIỆP PHỤ NỮ PHƯỜNG SƠN TRÀ</p>
          <h1 className="mt-3 text-3xl font-bold md:text-5xl">Văn phòng Hội & Sổ Chi hội</h1>
          <p className="mt-3 max-w-2xl text-base opacity-90 md:text-lg">
            Kết nối 42 Chi hội · Đồng hành cùng phụ nữ · Điều hành hiệu quả
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-5 py-8 md:grid-cols-[1.1fr_1fr]">
        <section className="panel p-6 md:col-span-2">
          <h2 className="text-xl font-bold text-primary">Vào Sổ Chi hội bằng liên kết riêng</h2>
          <p className="mt-1 text-sm text-muted-foreground">Mở liên kết riêng do Văn phòng gửi qua Zalo để vào đúng Sổ, không cần email hoặc mã. Chọn Chi hội bên dưới chỉ mở lối vào chung, không cấp quyền.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <select aria-label="Chọn Chi hội" className="field flex-1" value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="">— Chọn Chi hội —</option>
              {Object.entries(CHAPTER_NAMES).map(([id, n]) => <option key={id} value={id}>Chi hội {n}</option>)}
            </select>
            <Button size="xl" disabled={!unit} onClick={() => navigate({ to: "/so/$unit", params: { unit } })}>Tiếp tục →</Button>
          </div>
          <div className="mt-4 rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">
            <b>Cán bộ Văn phòng Hội:</b> mở <Link to="/van-phong" className="font-semibold text-primary underline">/van-phong</Link> và nhập mã bảo vệ Văn phòng — không cần email.
          </div>
        </section>
        <section className="panel p-6">
          <h2 className="text-xl font-bold text-primary">Quản trị viên: đăng nhập bằng email</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dành cho quản trị viên/cán bộ được cấp email. Chi hội không cần dùng cách này.
          </p>
          {step === "email" ? (
            <form onSubmit={sendCode} className="mt-5 space-y-4">
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input id="email" type="email" required autoComplete="email" inputMode="email" className="field"
                  value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ten@gmail.com" />
              </div>
              <Button type="submit" size="xl" className="w-full" disabled={busy}>
                {busy ? "Đang gửi…" : "Gửi mã đăng nhập"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-5 space-y-4">
              <div>
                <label className="label" htmlFor="code">Mã trong email gửi tới {email}</label>
                <input id="code" required inputMode="numeric" autoComplete="one-time-code" className="field text-center text-2xl tracking-[0.4em]"
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} maxLength={8} />
              </div>
              <Button type="submit" size="xl" className="w-full" disabled={busy || code.length < 6}>
                {busy ? "Đang kiểm tra…" : "Đăng nhập"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep("email"); setCode(""); setMsg(null); }}>
                Đổi email khác
              </Button>
            </form>
          )}
          {msg && <p className="mt-4 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground" role="status">{msg}</p>}
        </section>

        <section className="space-y-4">
          <div className="panel p-5">
            <h3 className="font-bold text-primary">Ai được sử dụng?</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>Mỗi Chi hội mở link riêng do Văn phòng cấp; không cần email, mật khẩu hay PIN.</li>
              <li>Văn phòng có thể đổi hoặc thu hồi link; các phiên mất quyền ở yêu cầu tiếp theo.</li>
              <li>Mỗi Chi hội chỉ thấy dữ liệu của mình. Hồ sơ nhạy cảm chỉ người được giao mới xem.</li>
            </ul>
          </div>
          <div className="panel p-5 text-sm text-muted-foreground">
            42 Chi hội · 20.943 hộ theo danh sách 08/2026 (Chi hội Công An không tính số hộ). Số hộ không phải số hội viên.
          </div>
        </section>
      </main>
    </div>
  );
}
