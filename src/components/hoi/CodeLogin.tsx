import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { unitLogin } from "@/lib/unit-login.functions";
import { unitLabel } from "@/lib/units";

/** Access-code login for one unit (Chi hội or Văn phòng). The code is never stored on the device. */
export function CodeLogin({ unit }: { unit: string }) {
  const login = useServerFn(unitLogin);
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await login({ data: { unit, pin } });
      if (!r.ok) { setMsg(r.message); setPin(""); return; }
      const { error } = await supabase.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token });
      if (error) { setMsg("Không lưu được phiên đăng nhập. Vui lòng thử lại."); return; }
      navigate({ to: "/app" });
    } catch {
      setMsg("Mất kết nối hoặc hệ thống tạm lỗi. Kiểm tra mạng rồi thử lại.");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="pin">Mã truy cập của {unitLabel(unit)} (8 chữ số)</label>
        <input id="pin" required inputMode="numeric" autoComplete="off" type="password"
          className="field text-center text-2xl tracking-[0.4em]" maxLength={8}
          value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
      </div>
      <Button type="submit" size="xl" className="w-full" disabled={busy || pin.length !== 8}>
        {busy ? "Đang kiểm tra…" : `Vào ${unit === "office" ? "Văn phòng" : "Sổ Chi hội"}`}
      </Button>
      {msg && <p className="rounded-xl bg-secondary p-3 text-sm text-secondary-foreground" role="alert">{msg}</p>}
      <p className="text-xs text-muted-foreground">Mã do Văn phòng Hội cấp riêng. Không chia sẻ mã lên nhóm Zalo/Facebook. Sai 5 lần sẽ khóa 15 phút.</p>
    </form>
  );
}
