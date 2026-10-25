import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LEGAL_AI_DAILY_LIMIT, searchFaqs, validateQuestion, type FaqLite } from "./legal";

export type LegalAiResult =
  | { mode: "ai"; answer: string; citedIds: string[]; remaining: number }
  | { mode: "faq"; reason: "no_key" | "quota" | "daily_limit" | "no_source" | "error"; message: string };

/**
 * Level-1 legal Q&A. AI only summarises Office-approved FAQs (with official sources);
 * personal data is refused server-side; no key / quota exhausted -> FAQ fallback, never paid fallback.
 */
export const askLegalAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { question: string }) => ({ question: String(input?.question ?? "").slice(0, 600) }))
  .handler(async ({ data, context }): Promise<LegalAiResult> => {
    const bad = validateQuestion(data.question);
    if (bad) throw new Error(bad);
    const key = process.env.GEMINI_API_KEY;
    if (!key) return { mode: "faq", reason: "no_key", message: "Trợ lý AI chưa được bật (chưa có khóa miễn phí). Xem các câu hỏi đáp đã duyệt bên dưới." };

    const { data: faqs, error } = await context.supabase.from("legal_faqs")
      .select("id,topic,question,answer,source_title,source_article").eq("status", "approved").limit(500);
    if (error) throw new Error("Không đọc được thư viện hỏi đáp.");
    const hits = searchFaqs((faqs ?? []) as FaqLite[], data.question, 6);
    if (!hits.length) return { mode: "faq", reason: "no_source", message: "Chưa có nguồn đã duyệt phù hợp nên không thể trả lời chắc chắn. Hãy gửi câu hỏi cho cán bộ Hội." };

    const { data: used, error: qe } = await context.supabase.rpc("consume_legal_ai", { _limit: LEGAL_AI_DAILY_LIMIT });
    if (qe) throw new Error("Không có quyền dùng chức năng này.");
    if ((used as number) < 0) return { mode: "faq", reason: "daily_limit", message: `Bạn đã dùng hết ${LEGAL_AI_DAILY_LIMIT} lượt hỏi AI hôm nay. Xem thư viện hỏi đáp bên dưới.` };

    const ctxText = hits.map((f, i) => `[${i + 1}] Hỏi: ${f.question}\nĐáp: ${f.answer}\nNguồn: ${f.source_title} ${f.source_article}`).join("\n\n");
    const prompt = `Bạn là trợ lý thông tin pháp luật CHUNG của Hội LHPN phường Sơn Trà. Chỉ được dùng các mục tham khảo dưới đây, không dùng kiến thức khác, không nêu điều luật không có trong tham khảo, không tư vấn cho trường hợp cá nhân. Trả lời tiếng Việt, ngắn gọn (tối đa 150 từ), cuối câu trả lời ghi "Căn cứ: [số]" theo mục đã dùng. Nếu tham khảo không đủ để trả lời, chỉ trả lời đúng một từ: KHONG_CHAC.\n\nTHAM KHẢO:\n${ctxText}\n\nCÂU HỎI: ${data.question.trim()}`;
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 600 } }),
      });
      if (r.status === 429 || r.status === 403) return { mode: "faq", reason: "quota", message: "Hạn mức AI miễn phí đã hết hoặc chưa được cấp. Xem thư viện hỏi đáp bên dưới." };
      if (!r.ok) return { mode: "faq", reason: "error", message: "Trợ lý AI tạm thời lỗi. Xem thư viện hỏi đáp bên dưới." };
      const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
      if (!text || text.includes("KHONG_CHAC")) return { mode: "faq", reason: "no_source", message: "Nguồn đã duyệt chưa đủ để trả lời chắc chắn. Hãy gửi câu hỏi cho cán bộ Hội." };
      const cited = [...text.matchAll(/\[(\d+)\]/g)].map((m) => hits[Number(m[1]) - 1]?.id).filter(Boolean) as string[];
      return { mode: "ai", answer: text, citedIds: cited.length ? [...new Set(cited)] : hits.slice(0, 2).map((h) => h.id), remaining: LEGAL_AI_DAILY_LIMIT - (used as number) };
    } catch {
      return { mode: "faq", reason: "error", message: "Không kết nối được trợ lý AI. Xem thư viện hỏi đáp bên dưới." };
    }
  });
