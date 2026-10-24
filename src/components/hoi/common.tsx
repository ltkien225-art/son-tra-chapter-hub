import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { flushPush } from "@/lib/push.functions";
import { viError, type Access, type Chapter } from "@/lib/hoi";

export type Ctx = { access: Access; chapters: Chapter[]; chapterId: string | null };

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-primary md:text-2xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="panel p-6 text-center text-muted-foreground">{children}</p>;
}

export function Pager({ page, total, size, onPage }: { page: number; total: number; size: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">Tổng {total.toLocaleString("vi-VN")} mục · Trang {page + 1}/{pages}</span>
      <div className="flex gap-2">
        <Button variant="soft" size="xl" disabled={page === 0} onClick={() => onPage(page - 1)}>‹ Trước</Button>
        <Button variant="soft" size="xl" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>Sau ›</Button>
      </div>
    </div>
  );
}

/** Runs an async action with toast feedback; returns true on success. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  async function run(fn: () => PromiseLike<{ error: unknown } | void | undefined>, ok?: string) {
    if (busy) return false;
    setBusy(true);
    try {
      const r = await fn();
      if (r && r.error) throw r.error;
      if (ok) toast.success(ok);
      flushPush().catch(() => {}); // deliver any notifications this change produced
      return true;
    } catch (e) {
      toast.error(viError(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, run };
}

export function ChapterName({ id, chapters }: { id: string; chapters: Chapter[] }) {
  return <>{chapters.find((c) => c.id === id)?.name ?? id}</>;
}

export function ChapterPicker({ chapters, value, onChange }: { chapters: Chapter[]; value: string[]; onChange: (v: string[]) => void }) {
  const all = value.length === chapters.length;
  return (
    <div>
      <div className="mb-2 flex gap-2">
        <Button type="button" size="sm" variant="soft" onClick={() => onChange(all ? [] : chapters.map((c) => c.id))}>
          {all ? "Bỏ chọn tất cả" : "Chọn tất cả 42"}
        </Button>
        <span className="self-center text-sm text-muted-foreground">Đã chọn {value.length}</span>
      </div>
      <div className="grid max-h-56 grid-cols-2 gap-1 overflow-auto rounded-xl border border-border p-2 sm:grid-cols-3">
        {chapters.map((c) => (
          <label key={c.id} className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm hover:bg-secondary">
            <input type="checkbox" className="size-5 accent-primary" checked={value.includes(c.id)}
              onChange={(e) => onChange(e.target.checked ? [...value, c.id] : value.filter((x) => x !== c.id))} />
            {c.name}
          </label>
        ))}
      </div>
    </div>
  );
}
