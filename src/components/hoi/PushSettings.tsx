import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime, viError } from "@/lib/hoi";
import { flushPush } from "@/lib/push.functions";
import { Empty, Section, type Ctx } from "./common";

export const VAPID_PUBLIC_KEY = "BCviTDsxUuI33JWtFh8i3v5PIaUZkr42oESXMSueKUxa_FQHBdvnLSnRqP-dvN7GaSGK_ZZkQxJIvY8IHC7fvfU";

const b64ToBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

function env() {
  if (typeof window === "undefined") return { supported: false, iframe: false, ios: false, standalone: false };
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  return { supported: "serviceWorker" in navigator && "PushManager" in window && "Notification" in window, iframe: window.self !== window.top, ios, standalone };
}

function deviceLabel() {
  const ua = navigator.userAgent;
  const os = /iphone|ipad/i.test(ua) ? "iPhone/iPad" : /android/i.test(ua) ? "Android" : /windows/i.test(ua) ? "Windows" : /mac/i.test(ua) ? "Mac" : "Thiết bị";
  const br = /edg\//i.test(ua) ? "Edge" : /chrome|crios/i.test(ua) ? "Chrome" : /firefox/i.test(ua) ? "Firefox" : /safari/i.test(ua) ? "Safari" : "Trình duyệt";
  return `${os} · ${br}`;
}

export function PushSettings({ ctx }: { ctx: Ctx }) {
  const qc = useQueryClient();
  const [e, setE] = useState(env);
  const [current, setCurrent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setE(env());
    if (!env().supported || env().iframe) return;
    navigator.serviceWorker.getRegistration("/").then((r) => r?.pushManager.getSubscription()).then((s) => setCurrent(s?.endpoint ?? null)).catch(() => {});
  }, []);

  const { data: subs = [] } = useQuery({
    queryKey: ["push-subs"],
    queryFn: async () => (await supabase.from("push_subscriptions").select("id,endpoint,device_label,disabled,last_ok_at,last_error,created_at").order("created_at")).data ?? [],
  });
  const { data: log = [] } = useQuery({
    queryKey: ["push-log"],
    queryFn: async () => (await supabase.from("notification_outbox").select("id,kind,title,status,delivered_devices,last_error,created_at").eq("recipient_email", ctx.access.email).order("created_at", { ascending: false }).limit(15)).data ?? [],
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["push-subs"] }); qc.invalidateQueries({ queryKey: ["push-log"] }); };

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Bạn chưa cho phép thông báo. Vào cài đặt trình duyệt để bật lại.");
      const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC_KEY) }));
      const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await supabase.from("push_subscriptions").delete().eq("endpoint", j.endpoint);
      const { error } = await supabase.from("push_subscriptions").insert({ email: ctx.access.email, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, device_label: deviceLabel() });
      if (error) throw error;
      setCurrent(j.endpoint);
      toast.success("Đã bật thông báo trên thiết bị này.");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error && !("code" in err) ? err.message : viError(err));
    } finally { setBusy(false); }
  }

  async function disable(endpoint: string, id: string) {
    setBusy(true);
    if (endpoint === current) {
      const reg = await navigator.serviceWorker.getRegistration("/");
      await (await reg?.pushManager.getSubscription())?.unsubscribe();
      setCurrent(null);
    }
    await supabase.from("push_subscriptions").delete().eq("id", id);
    setBusy(false);
    toast.success("Đã tắt thông báo cho thiết bị.");
    refresh();
  }

  async function test(): Promise<unknown> {
    setBusy(true);
    const { error } = await supabase.rpc("enqueue_test_push");
    if (error) { setBusy(false); return toast.error(viError(error)); }
    try {
      const r = await flushPush();
      toast.success(`Đã gửi thử: ${r.deliveries} thiết bị nhận.`);
    } catch (err) { toast.error(viError(err)); }
    setBusy(false);
    refresh();
  }

  return (
    <Section title="Thông báo trên điện thoại / máy tính">
      <div className="panel space-y-3 p-5">
        {e.iframe ? (
          <p className="text-sm">Đang xem trong khung xem trước. Hãy mở ứng dụng ở tab riêng (hoặc trên điện thoại) để bật thông báo.</p>
        ) : e.ios && !e.standalone ? (
          <div className="space-y-2 text-sm">
            <p className="font-semibold">iPhone/iPad cần thêm ứng dụng vào Màn hình chính trước (iOS 16.4 trở lên):</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Mở trang này bằng <b>Safari</b>.</li>
              <li>Bấm nút <b>Chia sẻ</b> (ô vuông có mũi tên lên).</li>
              <li>Chọn <b>Thêm vào MH chính</b> → <b>Thêm</b>.</li>
              <li>Mở ứng dụng từ biểu tượng hoa sen, đăng nhập, vào mục Thông báo và bấm “Bật thông báo”.</li>
            </ol>
          </div>
        ) : !e.supported ? (
          <p className="text-sm">Trình duyệt này không hỗ trợ thông báo đẩy. Dùng Chrome (Android/máy tính) hoặc Safari trên iPhone đã thêm vào Màn hình chính.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {!current && <Button size="xl" disabled={busy} onClick={enable}>Bật thông báo trên thiết bị này</Button>}
            {current && <span className="chip chip-ok self-center">Thiết bị này đang nhận thông báo</span>}
            <Button size="xl" variant="soft" disabled={busy || !subs.some((s) => !s.disabled)} onClick={test}>Gửi thử</Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Thông báo chỉ báo “có văn bản/nhiệm vụ/báo cáo mới”, không chứa nội dung hay thông tin cá nhân. Dữ liệu vẫn đồng bộ khi mở ứng dụng dù tắt thông báo.</p>
      </div>

      <h3 className="font-bold">Thiết bị đã đăng ký ({subs.length})</h3>
      {subs.length === 0 ? <Empty>Chưa có thiết bị nào.</Empty> : (
        <ul className="space-y-2">{subs.map((s) => (
          <li key={s.id} className="panel flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div>
              <b>{s.device_label || "Thiết bị"}</b> {s.endpoint === current && <span className="chip ml-1">Máy này</span>} {s.disabled && <span className="chip chip-danger ml-1">Hỏng — bật lại</span>}
              <div className="text-xs text-muted-foreground">Đăng ký {fmtDateTime(s.created_at)} · Nhận gần nhất {fmtDateTime(s.last_ok_at)}</div>
            </div>
            <Button size="sm" variant="soft" disabled={busy} onClick={() => disable(s.endpoint, s.id)}>Tắt</Button>
          </li>))}</ul>
      )}

      <h3 className="font-bold">Thông báo gần đây</h3>
      {log.length === 0 ? <Empty>Chưa có.</Empty> : (
        <div className="panel overflow-auto"><table className="tbl"><thead><tr><th>Thời gian</th><th>Nội dung</th><th>Kết quả</th></tr></thead>
          <tbody>{log.map((l) => <tr key={l.id}><td className="whitespace-nowrap text-xs">{fmtDateTime(l.created_at)}</td><td>{l.title}</td>
            <td className="text-xs">{l.status === "sent" ? `Đã gửi ${l.delivered_devices} thiết bị` : l.status === "pending" ? "Đang chờ/thử lại" : l.status === "skipped" ? (l.last_error === "no_device" ? "Chưa có thiết bị" : "Bỏ qua") : "Lỗi"}</td></tr>)}</tbody></table></div>
      )}
    </Section>
  );
}
