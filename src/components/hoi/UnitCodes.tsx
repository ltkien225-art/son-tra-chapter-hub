import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Copy, Link2, RefreshCw, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fmtDateTime, viError } from "@/lib/hoi";
import { listChapterLinks, manageChapterLink } from "@/lib/chapter-links.functions";
import { CHAPTER_NAMES, unitLabel } from "@/lib/units";
import { Section } from "./common";

export function ChapterLinks() {
  const qc = useQueryClient();
  const list = useServerFn(listChapterLinks);
  const manage = useServerFn(manageChapterLink);
  const [busy, setBusy] = useState<string | null>(null);
  const [shown, setShown] = useState<{ chapter: string; url: string } | null>(null);
  const { data, error, isPending } = useQuery({ queryKey: ["chapter-private-links"], queryFn: () => list() });
  useEffect(() => { const hide = () => { if (document.hidden) setShown(null); }; document.addEventListener("visibilitychange", hide); return () => document.removeEventListener("visibilitychange", hide); }, []);
  const row = (chapter: string) => data?.find((r) => r.chapter_id === chapter && r.active);
  async function act(chapter: string, action: "issue" | "copy" | "rotate" | "revoke") {
    if (action === "rotate" && !confirm(`Đổi liên kết Sổ của ${unitLabel(chapter)}? Link cũ và mọi phiên mở bằng link cũ mất quyền ở yêu cầu tiếp theo. Dữ liệu và tệp được giữ nguyên.`)) return;
    if (action === "revoke" && !confirm(`Thu hồi liên kết Sổ của ${unitLabel(chapter)}? Mọi thiết bị dùng link này sẽ mất quyền; không xóa báo cáo hoặc tệp.`)) return;
    setBusy(chapter); setShown(null);
    try {
      const r = await manage({ data: { chapter, action } });
      if (r.token) {
        const url = `${window.location.origin}/so/${chapter}#k=${r.token}`;
        setShown({ chapter, url });
        if (action === "copy") {
          try { await navigator.clipboard.writeText(url); toast.success("Đã sao chép liên kết Sổ, không đổi link."); }
          catch { toast.error("Chưa sao chép được. Nhấn giữ liên kết đang hiển thị để sao chép."); }
        } else toast.success("Đã cấp liên kết Sổ. Gửi riêng cho người phụ trách.");
      } else toast.success("Đã thu hồi liên kết. Các phiên mất quyền ở yêu cầu tiếp theo.");
      await qc.invalidateQueries({ queryKey: ["chapter-private-links"] });
    } catch (e) { toast.error(viError(e)); }
    finally { setBusy(null); }
  }
  return <Section title="Quản lý liên kết Sổ 42 Chi hội">
    <p className="text-sm">Chọn đúng Chi hội, cấp liên kết Sổ rồi sao chép gửi Zalo riêng. Người nhận mở link là vào đúng Sổ, không cần email hay mã. Một link dùng được trên nhiều điện thoại và laptop, đến khi đổi hoặc thu hồi.</p>
    <p className="text-sm text-muted-foreground">Ai có link sẽ có quyền của Chi hội đó. Không đăng lên nhóm công khai. Sao chép không thay đổi link; đổi hoặc thu hồi không xóa dữ liệu.</p>
    {isPending && <p role="status">Đang đọc trạng thái liên kết…</p>}
    {error && <p role="alert" className="text-destructive">{viError(error)}</p>}
    {shown && <section className="space-y-3 rounded-lg border border-primary p-4">
      <p className="font-bold">Liên kết riêng · {unitLabel(shown.chapter)}</p>
      <p className="break-all select-all text-sm" data-testid="chapter-private-link">{shown.url}</p>
      <div className="flex flex-wrap gap-2"><Button size="xl" onClick={() => act(shown.chapter, "copy")} disabled={busy !== null}><Copy />Sao chép gửi Zalo</Button><Button variant="outline" onClick={() => setShown(null)}>Ẩn liên kết</Button></div>
    </section>}
    <div className="grid gap-3 md:grid-cols-2">{Object.keys(CHAPTER_NAMES).map((chapter) => {
      const r = row(chapter);
      return <div key={chapter} className="panel space-y-3 p-4">
        <div><h3 className="font-semibold">{unitLabel(chapter)}</h3><p className="text-xs text-muted-foreground">{r ? `Đang hoạt động · cấp ${fmtDateTime(r.created_at)}` : "Chưa có liên kết hoạt động"}</p></div>
        <div className="flex flex-wrap gap-2">
          {r ? <><Button size="xl" disabled={busy !== null || isPending || !!error} onClick={() => act(chapter, "copy")}><Copy />Sao chép link Sổ</Button><Button variant="outline" disabled={busy !== null} onClick={() => act(chapter, "rotate")}><RefreshCw />Đổi link</Button><Button variant="destructive" disabled={busy !== null} onClick={() => act(chapter, "revoke")}><ShieldX />Thu hồi</Button></> : <Button size="xl" disabled={busy !== null || isPending || !!error} onClick={() => act(chapter, "issue")}><Link2 />Cấp liên kết Sổ</Button>}
        </div>
      </div>;
    })}</div>
  </Section>;
}
