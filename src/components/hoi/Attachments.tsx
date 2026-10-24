import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MAX_FILE, viError } from "@/lib/hoi";

export type OwnerType = "submission" | "document" | "sensitive_case" | "task";
const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.webp,.heic";
export const FILE_LIMIT_TEXT = "PDF hoặc ảnh JPG, PNG, WEBP, HEIC · tối đa 10 MB mỗi tệp";

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

/** Reads the first bytes to detect the real type; a renamed file is rejected. */
export async function sniffMime(file: File): Promise<string | null> {
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const s = (i: number, n: number) => String.fromCharCode(...b.slice(i, i + n));
  if (s(0, 4) === "%PDF") return "application/pdf";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && s(1, 3) === "PNG") return "image/png";
  if (s(0, 4) === "RIFF" && s(8, 4) === "WEBP") return "image/webp";
  if (s(4, 4) === "ftyp" && /^(heic|heix|mif1|msf1|heim|heis|hevc)$/.test(s(8, 4))) return "image/heic";
  return null;
}

export async function validateFile(file: File): Promise<{ mime: string } | { error: string }> {
  if (file.size === 0) return { error: "Tệp rỗng." };
  if (file.size > MAX_FILE) return { error: `Tệp ${kb(file.size)} vượt quá 10 MB.` };
  const mime = await sniffMime(file);
  if (!mime) return { error: "Không phải PDF hoặc ảnh hợp lệ (có thể tệp bị đổi đuôi)." };
  return { mime };
}

export async function uploadOne(ownerType: OwnerType, ownerId: string, file: File) {
  const v = await validateFile(file);
  if ("error" in v) throw new Error(v.error);
  const ext = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" }[v.mime]!;
  const path = `${ownerType}/${ownerId}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from("evidence").upload(path, file, { contentType: v.mime });
  if (up.error) throw up.error;
  const ins = await supabase.from("attachments").insert({
    owner_type: ownerType, owner_id: ownerId, path, filename: file.name.slice(0, 200) || `tep.${ext}`, mime: v.mime, size_bytes: file.size, created_by: "",
  });
  if (ins.error) throw ins.error;
}

/** File chooser used in "create" forms before the record exists: files are kept in the form and uploaded right after saving. */
export function FilePicker({ files, onChange, label = "Đính kèm PDF / ảnh / minh chứng" }: { files: File[]; onChange: (f: File[]) => void; label?: string }) {
  const [errs, setErrs] = useState<string[]>([]);
  async function add(list: FileList | null) {
    if (!list) return;
    const ok: File[] = []; const bad: string[] = [];
    for (const f of Array.from(list)) {
      const v = await validateFile(f);
      if ("error" in v) bad.push(`${f.name}: ${v.error}`); else ok.push(f);
    }
    setErrs(bad);
    onChange([...files, ...ok].slice(0, 20));
  }
  return (
    <div className="space-y-2">
      <PickButton label={label} onFiles={add} />
      {errs.map((e) => <p key={e} className="text-sm text-destructive">⚠ {e}</p>)}
      {files.map((f, i) => (
        <div key={i} className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2 text-sm">
          <span className="break-all">📎 {f.name} <span className="text-muted-foreground">({kb(f.size)}) · chờ lưu</span></span>
          <Button size="sm" variant="soft" onClick={() => onChange(files.filter((_, j) => j !== i))}>Bỏ</Button>
        </div>
      ))}
      {files.length > 0 && <p className="text-xs text-muted-foreground">Tệp sẽ được tải lên ngay sau khi bấm Lưu/Gửi.</p>}
    </div>
  );
}

function PickButton({ label, onFiles, disabled }: { label: string; onFiles: (f: FileList | null) => void; disabled?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
      <label className={`flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/50 bg-secondary px-3 py-2 text-center font-semibold text-primary hover:bg-secondary/70 ${disabled ? "pointer-events-none opacity-60" : ""}`}>
        <span>📎 {label}</span>
        <span className="text-xs font-normal text-muted-foreground">{FILE_LIMIT_TEXT} · chọn được nhiều tệp</span>
        <input type="file" multiple className="sr-only" accept={ACCEPT} disabled={disabled}
          onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      </label>
      <label className={`flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-input px-4 text-sm font-semibold text-secondary-foreground sm:hidden ${disabled ? "pointer-events-none opacity-60" : ""}`}>
        📷 Chụp ảnh
        <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={disabled}
          onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      </label>
    </div>
  );
}

type QItem = { key: string; file: File; status: "waiting" | "uploading" | "done" | "error"; error?: string | undefined };

/** Private files of one record: list, multi-upload queue with retry, in-app viewer and download through 60-second signed links issued only after the backend permission check. */
export function Attachments({ ownerType, ownerId, canUpload, autoFiles, title = "Tệp đính kèm" }: {
  ownerType: OwnerType; ownerId: string; canUpload: boolean; autoFiles?: File[] | undefined; title?: string;
}) {
  const qc = useQueryClient();
  const key = ["attachments", ownerType, ownerId];
  const { data, error } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("attachments").select("id,path,filename,mime,size_bytes,created_at")
        .eq("owner_type", ownerType).eq("owner_id", ownerId).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const [queue, setQueue] = useState<QItem[]>([]);
  const [preview, setPreview] = useState<{ url: string; mime: string; name: string; path: string } | null>(null);
  const [zoom, setZoom] = useState(false);
  const started = useRef(false);

  async function process(items: QItem[]) {
    for (const it of items) {
      setQueue((q) => q.map((x) => (x.key === it.key ? { ...x, status: "uploading", error: undefined } : x)));
      try {
        await uploadOne(ownerType, ownerId, it.file);
        setQueue((q) => q.map((x) => (x.key === it.key ? { ...x, status: "done" } : x)));
      } catch (e) {
        setQueue((q) => q.map((x) => (x.key === it.key ? { ...x, status: "error", error: viError(e) } : x)));
      }
    }
    qc.invalidateQueries({ queryKey: key });
  }
  function enqueue(files: File[]) {
    const items = files.map((file) => ({ key: crypto.randomUUID(), file, status: "waiting" as const }));
    setQueue((q) => [...q.filter((x) => x.status !== "done"), ...items]);
    void process(items);
  }
  useEffect(() => {
    if (autoFiles?.length && !started.current) { started.current = true; enqueue(autoFiles); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFiles]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  /** Every open/download goes through /api/files/:id, which re-checks current permission on each request (no signed link that outlives a revocation). */
  async function fetchFile(id: string, mime: string): Promise<Blob | null> {
    const { data: s } = await supabase.auth.getSession();
    const res = await fetch(`/api/files/${id}`, { headers: { Authorization: `Bearer ${s.session?.access_token ?? ""}` }, cache: "no-store" });
    if (res.status === 401 || res.status === 403) { toast.error("Bạn không có quyền mở tệp này hoặc tệp đã bị thu hồi."); return null; }
    if (!res.ok) { toast.error("Không tải được tệp. Kiểm tra mạng rồi thử lại."); return null; }
    return new Blob([await res.blob()], { type: mime });
  }
  async function view(a: { id: string; path: string; mime: string; filename: string }) {
    try {
      const blob = await fetchFile(a.id, a.mime);
      if (!blob) return;
      setZoom(false);
      setPreview({ url: URL.createObjectURL(blob), mime: a.mime, name: a.filename, path: a.path });
    } catch { toast.error("Không tải được tệp. Kiểm tra mạng rồi thử lại."); }
  }
  async function download(a: { id: string; mime: string; filename: string }) {
    try {
      const blob = await fetchFile(a.id, a.mime);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const el = document.createElement("a");
      el.href = url; el.download = a.filename; document.body.appendChild(el); el.click(); el.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch { toast.error("Không tải được tệp. Kiểm tra mạng rồi thử lại."); }
  }

  const rows = data ?? [];
  const busy = queue.some((q) => q.status === "uploading" || q.status === "waiting");
  return (
    <div className="space-y-2 rounded-2xl border border-border p-3">
      <p className="text-sm font-bold text-primary">{title} ({rows.length})</p>
      {error && <p className="text-sm text-destructive">{viError(error)}</p>}
      {rows.length === 0 && !canUpload && <p className="text-sm text-muted-foreground">Không có tệp đính kèm.</p>}
      {rows.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2 text-sm">
          <span className="break-all">{a.mime === "application/pdf" ? "📄" : "🖼️"} {a.filename} <span className="text-muted-foreground">({kb(a.size_bytes)})</span></span>
          <span className="flex gap-2">
            <Button size="sm" variant="soft" onClick={() => view(a)}>Xem</Button>
            <Button size="sm" variant="soft" onClick={() => download(a)}>Tải về</Button>
          </span>
        </div>
      ))}
      {queue.map((q) => (
        <div key={q.key} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm ${q.status === "error" ? "bg-destructive/10" : "bg-secondary"}`}>
          <span className="break-all">📎 {q.file.name} ({kb(q.file.size)}) —{" "}
            {q.status === "waiting" ? "chờ tải" : q.status === "uploading" ? "đang tải lên…" : q.status === "done" ? "✓ đã tải lên" : <span className="text-destructive">lỗi: {q.error}</span>}</span>
          {q.status === "error" && (
            <span className="flex gap-2">
              <Button size="sm" onClick={() => process([q])}>Thử lại</Button>
              <Button size="sm" variant="soft" onClick={() => setQueue((x) => x.filter((y) => y.key !== q.key))}>Bỏ</Button>
            </span>
          )}
        </div>
      ))}
      {canUpload && <PickButton label={busy ? "Đang tải lên…" : "Đính kèm PDF / ảnh / minh chứng"} disabled={busy}
        onFiles={(l) => l && enqueue(Array.from(l))} />}
      {preview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-foreground/85 p-3" role="dialog" aria-label={preview.name}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-primary-foreground">{preview.name}</span>
            <div className="flex flex-wrap gap-2">
              {preview.mime.startsWith("image/") && <Button size="sm" variant="hero" onClick={() => setZoom(!zoom)}>{zoom ? "Thu nhỏ" : "Phóng to"}</Button>}
              <Button size="sm" variant="hero" asChild><a href={preview.url} target="_blank" rel="noreferrer">Mở toàn màn hình</a></Button>
              <Button size="sm" variant="hero" asChild><a href={preview.url} download={preview.name}>Tải về</a></Button>
              <Button size="sm" variant="hero" onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }}>Đóng</Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto rounded-xl bg-card">
            {preview.mime.startsWith("image/") ? (
              <img src={preview.url} alt={preview.name} onClick={() => setZoom(!zoom)}
                className={zoom ? "max-w-none cursor-zoom-out" : "mx-auto max-h-full max-w-full cursor-zoom-in object-contain"} />
            ) : (
              <iframe src={preview.url} title={preview.name} className="h-full w-full" />
            )}
          </div>
          <p className="mt-2 text-center text-xs text-primary-foreground">Tệp chỉ mở được khi bạn còn quyền. iPhone: nếu PDF chỉ hiện trang đầu, bấm “Mở toàn màn hình”.</p>
        </div>
      )}
    </div>
  );
}
