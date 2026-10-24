import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ALLOWED_MIME, MAX_FILE, viError } from "@/lib/hoi";

type OwnerType = "submission" | "document" | "sensitive_case";

/** Private evidence: list, upload, and view through a 60-second signed link that the backend issues only after a permission check. */
export function Attachments({ ownerType, ownerId, canUpload }: { ownerType: OwnerType; ownerId: string; canUpload: boolean }) {
  const qc = useQueryClient();
  const key = ["attachments", ownerType, ownerId];
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("attachments").select("id,path,filename,mime,size_bytes,created_at")
        .eq("owner_type", ownerType).eq("owner_id", ownerId).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ url: string; mime: string; name: string } | null>(null);

  async function upload(file: File) {
    if (!ALLOWED_MIME.includes(file.type)) { toast.error("Chỉ nhận PDF hoặc ảnh (JPG, PNG, WEBP, HEIC)."); return; }
    if (file.size > MAX_FILE) { toast.error("Tệp vượt quá 10 MB."); return; }
    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const path = `${ownerType}/${ownerId}/${crypto.randomUUID()}.${ext}`;
    try {
      const up = await supabase.storage.from("evidence").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const ins = await supabase.from("attachments").insert({
        owner_type: ownerType, owner_id: ownerId, path, filename: file.name.slice(0, 200), mime: file.type, size_bytes: file.size, created_by: "",
      });
      if (ins.error) throw ins.error;
      toast.success("Đã đính kèm minh chứng.");
      qc.invalidateQueries({ queryKey: key });
    } catch (e) {
      toast.error(viError(e));
    } finally {
      setBusy(false);
    }
  }

  async function view(a: { path: string; mime: string; filename: string }) {
    const { data, error } = await supabase.storage.from("evidence").createSignedUrl(a.path, 60);
    if (error || !data) { toast.error("Bạn không có quyền xem tệp này."); return; }
    setPreview({ url: data.signedUrl, mime: a.mime, name: a.filename });
  }

  return (
    <div className="space-y-2">
      {(data ?? []).map((a) => (
        <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2 text-sm">
          <span className="break-all">📎 {a.filename} <span className="text-muted-foreground">({Math.ceil(a.size_bytes / 1024)} KB)</span></span>
          <Button size="sm" variant="soft" onClick={() => view(a)}>Xem</Button>
        </div>
      ))}
      {canUpload && (
        <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-input px-3 text-sm font-semibold text-secondary-foreground hover:bg-secondary">
          {busy ? "Đang tải lên…" : "＋ Thêm PDF/ảnh minh chứng (tối đa 10 MB)"}
          <input type="file" className="sr-only" accept={ALLOWED_MIME.join(",")} disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
      )}
      {preview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-foreground/80 p-3" role="dialog" aria-label={preview.name}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-primary-foreground">{preview.name}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="hero" asChild><a href={preview.url} target="_blank" rel="noreferrer">Mở/tải</a></Button>
              <Button size="sm" variant="hero" onClick={() => setPreview(null)}>Đóng</Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto rounded-xl bg-card">
            {preview.mime.startsWith("image/") ? (
              <img src={preview.url} alt={preview.name} className="mx-auto max-h-full" />
            ) : (
              <iframe src={preview.url} title={preview.name} className="h-full w-full" />
            )}
          </div>
          <p className="mt-2 text-center text-xs text-primary-foreground">Liên kết xem chỉ có hiệu lực 60 giây.</p>
        </div>
      )}
    </div>
  );
}
