import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LEGAL_AI_DAILY_LIMIT, validateQuestion } from "./legal";
import { LEGAL_LOOKUP_LIMITATION, type LegalClaim, type LegalSource } from "./legal-evidence";
import { setResponseHeader } from "@tanstack/react-start/server";

export type LegalAiResult =
  | { mode: "ai"; answer: string; claims: LegalClaim[]; sources: Omit<LegalSource, "text">[]; limitation: string; retrievedAt: string; remaining: number }
  | { mode: "faq"; reason: "no_key" | "quota" | "daily_limit" | "no_source" | "error"; message: string; remaining?: number; providerStatus?: number | undefined; sources?: Omit<LegalSource, "text">[]; retrievedAt?: string };

/**
 * General legal research from actually retrieved official sources; FAQ optional.
 * Personal data refused server-side; no paid search tool or paid fallback.
 */
export const askLegalAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { question: string }) => {
    const question = typeof input?.question === "string" ? input.question : "";
    const bad = validateQuestion(question); if (bad) throw new Error(bad);
    return { question };
  })
  .handler(async ({ data, context }): Promise<LegalAiResult> => {
    const bad = validateQuestion(data.question);
    if (bad) throw new Error(bad);
    setResponseHeader("Cache-Control", "no-store");
    const { data: access, error: ae } = await context.supabase.rpc("my_access");
    const a = access as { office?: boolean; chapters?: string[] } | null;
    if (ae || !(a?.office || a?.chapters?.length)) throw new Error("Không có quyền dùng chức năng này.");
    const key = process.env["GEMINI_API_KEY"];
    if (!key) return { mode: "faq", reason: "no_key", message: "Chưa cấu hình trợ lý Gemini. Thư viện hỏi đáp vẫn dùng được." };

    const { data: used, error: qe } = await context.supabase.rpc("consume_legal_ai", { _limit: LEGAL_AI_DAILY_LIMIT });
    if (qe) throw new Error("Không có quyền dùng chức năng này.");
    if (typeof used !== "number") throw new Error("Không kiểm tra được hạn mức.");
    if (used < 0) return { mode: "faq", reason: "daily_limit", remaining: 0, message: `Bạn đã dùng hết ${LEGAL_AI_DAILY_LIMIT} lượt tra cứu hôm nay. Thư viện hỏi đáp vẫn dùng được.` };
    const remaining = LEGAL_AI_DAILY_LIMIT - used;
    const retrievedAt = new Date().toISOString();
    try {
      const { retrieveLegalSources, answerFromSources } = await import("./legal-research.server");
      const evidence = await retrieveLegalSources(data.question, key);
      const sources = evidence.map(({ text: _text, ...source }) => source);
      if (!evidence.some((s) => s.kind === "text")) return { mode: "faq", reason: "no_source", remaining, sources, retrievedAt, message: "Chưa tải được toàn văn nguồn phù hợp để kiểm chứng câu trả lời. Không suy đoán điều luật hoặc thủ tục. Hãy hỏi cán bộ/cơ quan có thẩm quyền; thư viện bên dưới vẫn dùng được." };
      const result = await answerFromSources(key, data.question, evidence);
      if (result.error) return { mode: "faq", reason: result.error, remaining, sources, retrievedAt, providerStatus: "status" in result ? result.status : undefined, message: result.error === "quota" ? "Google từ chối quyền/hạn mức (không chuyển sang dịch vụ trả phí). Thư viện hỏi đáp vẫn dùng được." : result.error === "no_source" ? "Nguồn thực truy xuất chưa đủ hỗ trợ câu trả lời, hoặc trích dẫn không kiểm chứng được. Hãy liên hệ cán bộ/cơ quan có thẩm quyền." : "Google hoặc nguồn tra cứu tạm lỗi. Không chuyển sang dịch vụ trả phí; thư viện hỏi đáp vẫn dùng được." };
      return { mode: "ai", answer: result.claims.map((c) => `${c.text} [${c.sourceId}]`).join("\n\n"), claims: result.claims, sources, remaining, retrievedAt, limitation: LEGAL_LOOKUP_LIMITATION };
    } catch {
      return { mode: "faq", reason: "error", remaining, retrievedAt, message: "Không tải được nguồn hoặc không kết nối được Gemini. Không suy đoán pháp luật; thư viện hỏi đáp vẫn dùng được." };
    }
  });
