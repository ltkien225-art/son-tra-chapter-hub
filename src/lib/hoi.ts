import { supabase } from "@/integrations/supabase/client";

export const ADMIN_EMAIL = "ubmttqvnphuongsontra@gmail.com";

export type Access = { email: string; admin: boolean; office: boolean; sensitive: boolean; chapters: string[] };
export type Chapter = { id: string; name: string; households: number | null };

export const KIND_LABEL: Record<string, string> = {
  report: "Báo cáo",
  activity: "Hoạt động, mô hình",
  situation: "Tình hình",
  feedback: "Phản ánh, kiến nghị",
};
export const DOC_STATUS: Record<string, string> = { draft: "Nháp", published: "Đã phát hành", withdrawn: "Đã thu hồi" };
export const TASK_STATUS: Record<string, string> = { active: "Đang thực hiện", withdrawn: "Đã thu hồi", archived: "Lưu trữ" };
export const ASSIGN_STATUS: Record<string, string> = { pending: "Chưa bắt đầu", in_progress: "Đang làm", completed: "Hoàn thành" };
export const CASE_CATEGORY: Record<string, string> = {
  violence: "Bạo lực gia đình",
  child: "Trẻ em",
  livelihood: "Sinh kế",
  health: "Sức khỏe",
  other: "Khác",
};
export const CASE_STATUS: Record<string, string> = { open: "Mới", in_progress: "Đang hỗ trợ", closed: "Đã kết thúc" };

export const ERROR_VI: Record<string, string> = {
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  not_found: "Không tìm thấy hoặc bạn không có quyền.",
  not_withdrawable: "Mục này đã được thu hồi trước đó.",
  task_not_active: "Nhiệm vụ không còn hoạt động.",
  bootstrap_admin_fixed: "Không thể thay đổi quyền của tài khoản quản trị chính.",
  chapter_catalogue_mismatch: "Danh mục 42 Chi hội trong tệp không khớp — đã từ chối khôi phục.",
  invalid_backup_format: "Tệp sao lưu không đúng định dạng.",
};

export function viError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  for (const k of Object.keys(ERROR_VI)) if (msg.includes(k)) return ERROR_VI[k];
  if (/row-level security|permission denied/i.test(msg)) return ERROR_VI.forbidden;
  return "Có lỗi xảy ra: " + msg;
}

export async function fetchAccess(): Promise<Access> {
  const { data, error } = await supabase.rpc("my_access");
  if (error) throw error;
  return data as unknown as Access;
}

export async function fetchChapters(): Promise<Chapter[]> {
  const { data, error } = await supabase.from("chapters").select("id,name,households").order("id");
  if (error) throw error;
  return data ?? [];
}

export const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString("vi-VN") : "—");
export const fmtDateTime = (s?: string | null) => (s ? new Date(s).toLocaleString("vi-VN") : "—");
export const fmtNum = (n?: number | null) => (n == null ? "—" : n.toLocaleString("vi-VN"));
export const today = () => new Date().toISOString().slice(0, 10);
export const thisPeriod = () => new Date().toISOString().slice(0, 7);
export const isOverdue = (due?: string | null, status?: string) => !!due && due < today() && status !== "completed";

export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];
export const MAX_FILE = 10 * 1024 * 1024;

export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function downloadCsv(name: string, rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    // neutralise spreadsheet formulas
    const safe = /^[=+\-@]/.test(s) ? "'" + s : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const blob = new Blob(["\ufeff" + rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
