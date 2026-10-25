import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useIsFetching, onlineManager } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useHoiSession } from "@/hooks/use-hoi-session";
import { fetchAccess, fetchChapters, fmtNum, viError } from "@/lib/hoi";
import type { Ctx } from "@/components/hoi/common";
import { Documents } from "@/components/hoi/Documents";
import { Tasks } from "@/components/hoi/Tasks";
import { Submissions } from "@/components/hoi/Submissions";
import { Members, useSummary } from "@/components/hoi/Members";
import { Sensitive } from "@/components/hoi/Sensitive";
import { AccessAdmin, Audit, Backup } from "@/components/hoi/AdminPanels";
import { Guide } from "@/components/hoi/Guide";
import { Legal } from "@/components/hoi/Legal";
import { PushSettings } from "@/components/hoi/PushSettings";
import { UnitCodes } from "@/components/hoi/UnitCodes";
import { HandoverPanel, OfficeCodePanel } from "@/components/hoi/OfficeSecurity";
import { codeLoginUnit, identityLabel, unitLabel } from "@/lib/units";

export const Route = createFileRoute("/app")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Không gian làm việc · Hội LHPN Sơn Trà" },
      { name: "description", content: "Văn phòng Hội và Sổ Chi hội — chỉ dành cho người được cấp quyền." },
      { property: "og:title", content: "Không gian làm việc · Hội LHPN Sơn Trà" },
      { property: "og:description", content: "Văn phòng Hội và Sổ Chi hội." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppPage,
});

type Tab = { id: string; label: string };

function AppPage() {
  const { session, ready } = useHoiSession();
  const navigate = useNavigate();
  useEffect(() => { if (ready && !session) navigate({ to: "/" }); }, [ready, session, navigate]);
  if (!ready || !session) return <div className="p-10 text-center text-muted-foreground">Đang tải…</div>;
  return <Workspace email={session.user.email ?? ""} userId={session.user.id} />;
}

function Workspace({ email, userId }: { email: string; userId: string }) {
  const access = useQuery({ queryKey: ["access"], queryFn: fetchAccess, refetchInterval: 60_000 });
  const chapters = useQuery({ queryKey: ["chapters", access.data], queryFn: fetchChapters, enabled: !!access.data });
  const [tab, setTab] = useState("home");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && /^[a-z]+$/.test(t)) setTab(t);
  }, []);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [book, setBook] = useState<string | null>(null); // Office viewing one Chi hội book (read-only, Office permissions)

  useEffect(() => {
    const own = access.data?.chapters ?? [];
    if (!chapterId || !own.includes(chapterId)) setChapterId(own[0] ?? null);
  }, [access.data, chapterId]);

  const signOut = () => supabase.auth.signOut();
  if (access.isLoading) return <div className="p-10 text-center text-muted-foreground">Đang kiểm tra quyền…</div>;
  if (access.error) return <div className="p-10 text-center">{viError(access.error)}</div>;
  const a = access.data!;
  const hasAny = a.office || a.chapters.length > 0;
  if (!hasAny) return <NoAccess email={email} userId={userId} onSignOut={signOut} />;

  const viewing = a.office && book ? book : null;
  const ctx: Ctx = viewing
    ? { access: { ...a, office: false, chapters: [viewing] }, chapters: chapters.data ?? [], chapterId: viewing, officeView: true }
    : { access: a, chapters: chapters.data ?? [], chapterId };
  const openBook = (id: string) => { setBook(id); setTab("docs"); window.scrollTo({ top: 0 }); };
  const closeBook = () => { setBook(null); setTab("home"); };
  const tabs: Tab[] = viewing
    ? [
        { id: "docs", label: "Văn bản nhận" }, { id: "tasks", label: "Nhiệm vụ" }, { id: "subs", label: "Báo cáo đã gửi" },
        { id: "members", label: "Hội viên" }, ...(a.sensitive ? [{ id: "sens", label: "Hồ sơ bảo mật" }] : []),
      ]
    : a.office
    ? [
        { id: "home", label: "Tổng quan" }, { id: "docs", label: "Văn bản" }, { id: "tasks", label: "Nhiệm vụ" },
        { id: "subs", label: "Báo cáo" }, { id: "members", label: "Hội viên" },
        ...(a.sensitive ? [{ id: "sens", label: "Hồ sơ bảo mật" }] : []),
        { id: "access", label: "Phân quyền" }, { id: "audit", label: "Nhật ký" },
        ...(a.admin ? [{ id: "backup", label: "Sao lưu" }] : []),
        { id: "legal", label: "Hỏi đáp pháp luật" }, { id: "push", label: "Thông báo" }, { id: "guide", label: "Hướng dẫn" },
      ]
    : [
        { id: "docs", label: "Văn bản" }, { id: "tasks", label: "Nhiệm vụ" }, { id: "subs", label: "Gửi báo cáo" },
        { id: "members", label: "Hội viên" }, ...(a.sensitive ? [{ id: "sens", label: "Hồ sơ bảo mật" }] : []),
        { id: "legal", label: "Hỏi đáp pháp luật" }, { id: "push", label: "Thông báo" }, { id: "guide", label: "Hướng dẫn" },
      ];
  const current = tabs.some((t) => t.id === tab) ? tab : (tabs[0]?.id ?? "guide");
  const chName = ctx.chapters.find((c) => c.id === ctx.chapterId)?.name;

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="hero-lotus px-4 pb-3 pt-5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] opacity-90">HỘI LHPN PHƯỜNG SƠN TRÀ</p>
            <h1 className="text-xl font-bold md:text-2xl">✿ {viewing ? `Sổ Chi hội ${chName ?? ""}` : a.office ? "Văn phòng Hội" : `Sổ Chi hội ${chName ?? ""}`}</h1>
            {viewing && <p className="text-xs font-semibold">Văn phòng đang xem (chỉ xem, theo quyền Văn phòng)</p>}
            <p className="text-xs opacity-90">{identityLabel(email) ?? email}</p>
          </div>
          <div className="flex items-center gap-2">
            {!a.office && a.chapters.length > 1 && (
              <select aria-label="Chọn Chi hội" className="field min-h-10 py-1 text-sm" value={chapterId ?? ""} onChange={(e) => setChapterId(e.target.value)}>
                {ctx.chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {viewing && <Button variant="hero" size="sm" onClick={closeBook}>← Về Văn phòng</Button>}
            <Button variant="hero" size="sm" onClick={signOut}>Đăng xuất</Button>
          </div>
        </div>
        <nav className="mx-auto mt-4 flex max-w-6xl gap-2 overflow-x-auto pb-1" aria-label="Chức năng">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition ${current === t.id ? "bg-primary-foreground text-primary" : "bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <SyncBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {current === "home" && <Dashboard ctx={ctx} go={setTab} openBook={openBook} />}
        {current === "docs" && <Documents ctx={ctx} />}
        {current === "tasks" && <Tasks ctx={ctx} />}
        {current === "subs" && <Submissions ctx={ctx} />}
        {current === "members" && <Members ctx={ctx} />}
        {current === "sens" && a.sensitive && <Sensitive ctx={ctx} />}
        {current === "access" && <div className="space-y-8">{a.admin && <><UnitCodes /><OfficeCodePanel /><HandoverPanel /></>}<AccessAdmin ctx={ctx} /></div>}
        {current === "audit" && <Audit />}
        {current === "backup" && a.admin && <Backup />}
        {current === "push" && <PushSettings ctx={ctx} />}
        {current === "legal" && <Legal ctx={ctx} />}
        {current === "guide" && <Guide office={a.office} />}
      </main>
    </div>
  );
}

function Dashboard({ ctx, go, openBook }: { ctx: Ctx; go: (t: string) => void; openBook: (id: string) => void }) {
  const { data = [] } = useSummary(null);
  const households = data.reduce((s, r) => s + (r.households ?? 0), 0);
  const subs = data.reduce((s, r) => s + Number(r.submissions_count), 0);
  const open = data.reduce((s, r) => s + Number(r.open_tasks), 0);
  const overdue = data.filter((r) => Number(r.overdue_tasks) > 0);
  const stats: [string, string, string][] = [
    ["Chi hội", fmtNum(data.length), "access"], ["Số hộ (danh sách 08/2026)", fmtNum(households), "members"],
    ["Báo cáo đang hiệu lực", fmtNum(subs), "subs"], ["Việc chưa hoàn thành", fmtNum(open), "tasks"],
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([l, v, t]) => (
          <button key={l} onClick={() => go(t)} className="panel p-4 text-left">
            <span className="text-sm text-muted-foreground">{l}</span>
            <b className="mt-1 block text-2xl text-primary md:text-3xl">{v}</b>
          </button>
        ))}
      </div>
      <div className="panel p-5">
        <h3 className="font-bold text-primary">Chi hội có việc quá hạn ({overdue.length})</h3>
        {overdue.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Không có.</p> : (
          <ul className="mt-2 flex flex-wrap gap-2">{overdue.map((r) => <li key={r.chapter_id} className="chip chip-danger">{r.name}: {r.overdue_tasks}</li>)}</ul>
        )}
      </div>
      <div className="panel p-5">
        <h3 className="font-bold text-primary">Danh mục 42 Chi hội — mở Sổ từng Chi hội</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((r) => (
            <li key={r.chapter_id} className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2">
              <span className="text-sm"><b>{r.name}</b><br /><span className="text-xs text-muted-foreground">{r.households == null ? "Không có số hộ" : `${fmtNum(r.households)} hộ`}{Number(r.overdue_tasks) > 0 ? ` · ${r.overdue_tasks} việc quá hạn` : ""}</span></span>
              <Button size="sm" onClick={() => openBook(r.chapter_id)}>Mở Sổ {r.name}</Button>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">Số hộ là số liệu dân cư, không phải số hội viên; Chi hội Công An không có số hộ. Dữ liệu tự làm mới khi bạn quay lại ứng dụng hoặc có mạng lại.{ctx.access.admin ? "" : ""}</p>
    </div>
  );
}

function NoAccess({ email, userId, onSignOut }: { email: string; userId: string; onSignOut: () => void }) {
  if (identityLabel(email)) return (
    <div className="mx-auto max-w-md p-8 text-center">
      <div className="panel space-y-4 p-6">
        <h2 className="text-xl font-bold text-primary">Mã truy cập đã được đổi hoặc thu hồi</h2>
        <p className="text-sm">Thiết bị này không còn quyền vào {unitLabel(codeLoginUnit(email)!)}. Liên hệ Văn phòng Hội để nhận mã mới.</p>
        <Button size="xl" className="w-full" onClick={onSignOut}>Đăng xuất và nhập mã mới</Button>
      </div>
    </div>
  );
  return <EmailNoAccess email={email} userId={userId} onSignOut={onSignOut} />;
}

function EmailNoAccess({ email, userId, onSignOut }: { email: string; userId: string; onSignOut: () => void }) {
  const [msg, setMsg] = useState("");
  const req = useQuery({
    queryKey: ["my-request"],
    queryFn: async () => (await supabase.from("access_requests").select("status,created_at").maybeSingle()).data,
  });
  const [sent, setSent] = useState(false);
  async function send() {
    const { error } = await supabase.from("access_requests").insert({ email: email.toLowerCase(), user_id: userId, message: msg.slice(0, 500) });
    if (!error || error.code === "23505") { setSent(true); req.refetch(); }
  }
  const status = req.data?.status;
  return (
    <div className="mx-auto max-w-lg space-y-4 px-5 py-12">
      <h1 className="text-2xl font-bold text-primary">Chưa được cấp quyền</h1>
      <p>Bạn đã đăng nhập bằng <b>{email}</b>, nhưng Văn phòng Hội chưa cấp quyền cho email này.</p>
      {status === "pending" || sent ? (
        <p className="panel p-4">Yêu cầu đã gửi, đang chờ Văn phòng duyệt. Khi được duyệt, tải lại trang là vào được.</p>
      ) : status === "rejected" ? (
        <p className="panel p-4">Yêu cầu chưa được chấp thuận. Vui lòng liên hệ Văn phòng Hội.</p>
      ) : (
        <div className="panel space-y-3 p-4">
          <label className="label" htmlFor="m">Họ tên, chức danh, Chi hội của bạn</label>
          <textarea id="m" className="field" maxLength={500} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="VD: Nguyễn Thị A — Chi hội trưởng Thành Vinh 1" />
          <Button size="xl" className="w-full" onClick={send}>Gửi yêu cầu cấp quyền</Button>
        </div>
      )}
      <Button variant="soft" size="xl" className="w-full" onClick={() => window.location.reload()}>Tải lại</Button>
      <Button variant="ghost" className="w-full" onClick={onSignOut}>Đăng xuất</Button>
    </div>
  );
}

function SyncBar() {
  const qc = useQueryClient();
  const fetching = useIsFetching();
  const [online, setOnline] = useState(true);
  const [last, setLast] = useState<Date | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setOnline(onlineManager.isOnline());
    const un1 = onlineManager.subscribe((o) => setOnline(o));
    const un2 = qc.getQueryCache().subscribe((e) => {
      if (e.type !== "updated") return;
      const st = e.query.state;
      if (st.status === "error" && st.fetchStatus === "idle") setFailed(true);
      if (st.status === "success" && st.fetchStatus === "idle") { setFailed(false); setLast(new Date(st.dataUpdatedAt)); }
    });
    return () => { un1(); un2(); };
  }, [qc]);
  const label = !online ? "Mất mạng — sẽ tự đồng bộ khi có mạng lại"
    : fetching > 0 ? "Đang đồng bộ…"
    : failed ? "Đồng bộ lỗi — bấm Làm mới để thử lại"
    : last ? `Đã đồng bộ lúc ${last.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : "Đã kết nối";
  const tone = !online || failed ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground";
  return (
    <div role="status" aria-live="polite" className={`${tone} px-4 py-2 text-sm`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <span>{label}</span>
        <Button size="sm" variant="outline" disabled={!online || fetching > 0} onClick={() => qc.invalidateQueries()}>Làm mới</Button>
      </div>
    </div>
  );
}
