import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime } from "@/lib/hoi";
import { askLegalAi, type LegalAiResult } from "@/lib/legal.functions";
import { LEGAL_Q_MAX, findPersonalData, searchFaqs, validateQuestion } from "@/lib/legal";
import { ChapterName, Empty, Section, useAction, type Ctx } from "./common";

type Faq = { id: string; topic: string; question: string; answer: string; source_title: string; source_article: string; source_url: string; effective_date: string | null; verified_on: string | null; status: string };
const EMPTY = { id: "", topic: "Chung", question: "", answer: "", source_title: "", source_article: "", source_url: "", effective_date: "", verified_on: "", status: "pending" };
const STATUS: Record<string, string> = { pending: "Chờ duyệt", approved: "Đã duyệt", retired: "Ngừng dùng" };

export function Legal({ ctx }: { ctx: Ctx }) {
  const office = ctx.access.office && !ctx.officeView;
  const [q, setQ] = useState("");
  const { data: faqs = [] } = useQuery({
    queryKey: ["legal_faqs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("legal_faqs").select("*").order("topic").order("created_at");
      if (error) throw error;
      return data as Faq[];
    },
  });
  const approved = faqs.filter((f) => f.status === "approved");
  const shown = useMemo(() => (q.trim() ? searchFaqs(office ? faqs : approved, q, 50) : office ? faqs : approved), [q, faqs, approved, office]);

  return (
    <div className="space-y-8">
      <Section title="Hỏi đáp pháp luật (thông tin chung)">
        <div className="panel space-y-1 border-2 border-destructive/40 p-4 text-sm">
          <p className="font-bold text-destructive">⚠ Không nhập họ tên, số điện thoại, CCCD, địa chỉ hay chi tiết vụ việc của bất kỳ ai.</p>
          <p>Đây chỉ là thông tin pháp luật chung, có ghi nguồn văn bản chính thức; không thay thế tư vấn pháp lý cho trường hợp cụ thể. Câu hỏi riêng hãy dùng mục “Gửi câu hỏi riêng cho cán bộ” bên dưới (không qua AI).</p>
        </div>
        <AskAi faqs={faqs} />
      </Section>

      <Section title={`Thư viện hỏi đáp ${office ? "(Văn phòng thấy cả mục chờ duyệt)" : "đã duyệt"}`}>
        <input className="field" placeholder="Tìm theo từ khóa, ví dụ: bạo lực gia đình, kết hôn, thừa kế…" value={q} onChange={(e) => setQ(e.target.value)} />
        {shown.length === 0 ? <Empty>{approved.length === 0 ? "Chưa có câu hỏi đáp nào được duyệt. Văn phòng cần kiểm chứng nguồn và duyệt." : "Không tìm thấy mục phù hợp."}</Empty> : (
          <ul className="space-y-3">{shown.map((f) => <FaqItem key={f.id} f={f} office={office} />)}</ul>
        )}
      </Section>

      {office && <FaqEditor />}
      <PrivateQuestions ctx={ctx} office={office} />
    </div>
  );
}

function Source({ f }: { f: Faq }) {
  return (
    <div className="mt-2 rounded-xl bg-secondary p-3 text-xs">
      <p><b>Căn cứ:</b> {f.source_title || "— chưa có nguồn —"} {f.source_article}</p>
      {f.source_url && <p><a className="font-semibold text-primary underline" href={f.source_url} target="_blank" rel="noopener noreferrer">Mở văn bản gốc</a></p>}
      <p className="text-muted-foreground">Hiệu lực: {f.effective_date ?? "chưa ghi"} · Kiểm chứng: {f.verified_on ?? "chưa kiểm chứng"}</p>
    </div>
  );
}

function FaqItem({ f, office }: { f: Faq; office: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="panel p-4">
      <button className="w-full text-left" onClick={() => setOpen(!open)}>
        <div className="flex flex-wrap gap-2 text-xs"><span className="chip">{f.topic}</span>
          {office && <span className={f.status === "approved" ? "chip chip-ok" : "chip chip-danger"}>{STATUS[f.status]}</span>}</div>
        <p className="mt-1 text-base font-semibold">{f.question}</p>
      </button>
      {open && <div className="mt-2 border-t border-border pt-2 text-sm"><p className="whitespace-pre-wrap">{f.answer}</p><Source f={f} /></div>}
    </li>
  );
}

function AskAi({ faqs }: { faqs: Faq[] }) {
  const ask = useServerFn(askLegalAi);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<LegalAiResult | null>(null);
  const [err, setErr] = useState("");
  const pii = findPersonalData(text);
  async function go() {
    const bad = validateQuestion(text);
    if (bad) { setErr(bad); return; }
    setBusy(true); setErr(""); setRes(null);
    try { setRes(await ask({ data: { question: text } })); }
    catch (e) { setErr(e instanceof Error ? e.message : "Có lỗi, vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  const cited = res?.mode === "ai" ? faqs.filter((f) => res.citedIds.includes(f.id)) : [];
  const fallback = res?.mode === "faq" ? searchFaqs(faqs.filter((f) => f.status === "approved"), text, 5) : [];
  return (
    <div className="panel space-y-3 p-5">
      <label className="label">Câu hỏi chung (tối đa {LEGAL_Q_MAX} ký tự)</label>
      <textarea className="field min-h-24" maxLength={LEGAL_Q_MAX} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ví dụ: Khi bị bạo lực gia đình có thể báo cho ai?" />
      {pii.length > 0 && <p className="text-sm font-semibold text-destructive">Có vẻ chứa {pii.join(", ")} — hãy xóa trước khi gửi.</p>}
      <Button size="xl" disabled={busy || pii.length > 0 || text.trim().length < 8} onClick={go}>{busy ? "Đang tra cứu…" : "Hỏi trợ lý (dựa trên nguồn đã duyệt)"}</Button>
      {err && <p className="text-sm font-semibold text-destructive">{err}</p>}
      {res?.mode === "ai" && (
        <div className="rounded-xl bg-accent p-4 text-sm">
          <p className="whitespace-pre-wrap">{res.answer}</p>
          {cited.map((f) => <Source key={f.id} f={f} />)}
          <p className="mt-2 text-xs text-muted-foreground">Trả lời tự động từ thư viện đã duyệt, có thể chưa đầy đủ. Còn {res.remaining} lượt hôm nay.</p>
        </div>
      )}
      {res?.mode === "faq" && (
        <div className="space-y-2 rounded-xl bg-secondary p-4 text-sm">
          <p className="font-semibold">{res.message}</p>
          {fallback.length > 0 && <ul className="list-disc pl-5">{fallback.map((f) => <li key={f.id}>{f.question}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}

function FaqEditor() {
  const qc = useQueryClient();
  const { busy, run } = useAction();
  const [f, setF] = useState({ ...EMPTY });
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const canApprove = f.source_title.trim() && /^https:\/\//.test(f.source_url) && f.verified_on;
  async function save(status: string) {
    const row = { topic: f.topic.trim() || "Chung", question: f.question.trim(), answer: f.answer.trim(), source_title: f.source_title.trim(), source_article: f.source_article.trim(), source_url: f.source_url.trim(), effective_date: f.effective_date || null, verified_on: f.verified_on || null, status };
    const ok = await run(() => (f.id ? supabase.from("legal_faqs").update(row).eq("id", f.id) : supabase.from("legal_faqs").insert({ ...row, created_by: "" })), status === "approved" ? "Đã lưu và duyệt." : "Đã lưu.");
    if (ok) { setF({ ...EMPTY }); qc.invalidateQueries({ queryKey: ["legal_faqs"] }); }
  }
  return (
    <Section title="Văn phòng: thêm / sửa / duyệt câu hỏi đáp">
      <div className="panel space-y-3 p-5">
        <EditPicker onPick={(x) => setF({ ...x, effective_date: x.effective_date ?? "", verified_on: x.verified_on ?? "" })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Chủ đề</label><input className="field" maxLength={80} value={f.topic} onChange={set("topic")} /></div>
          <div><label className="label">Văn bản nguồn (tên, số hiệu)</label><input className="field" maxLength={300} value={f.source_title} onChange={set("source_title")} /></div>
          <div><label className="label">Điều/khoản</label><input className="field" maxLength={200} value={f.source_article} onChange={set("source_article")} /></div>
          <div><label className="label">Liên kết văn bản chính thức (https://)</label><input className="field" value={f.source_url} onChange={set("source_url")} /></div>
          <div><label className="label">Ngày hiệu lực</label><input type="date" className="field" value={f.effective_date} onChange={set("effective_date")} /></div>
          <div><label className="label">Ngày kiểm chứng nguồn</label><input type="date" className="field" value={f.verified_on} onChange={set("verified_on")} /></div>
        </div>
        <div><label className="label">Câu hỏi *</label><input className="field" maxLength={500} value={f.question} onChange={set("question")} /></div>
        <div><label className="label">Trả lời (thông tin chung) *</label><textarea className="field min-h-28" maxLength={6000} value={f.answer} onChange={set("answer")} /></div>
        <div className="flex flex-wrap gap-2">
          <Button size="xl" variant="soft" disabled={busy || f.question.trim().length < 5 || f.answer.trim().length < 5} onClick={() => save("pending")}>Lưu (chờ duyệt)</Button>
          <Button size="xl" disabled={busy || !canApprove || f.question.trim().length < 5} onClick={() => save("approved")}>Duyệt & hiển thị</Button>
          {f.id && <Button size="xl" variant="destructive" disabled={busy} onClick={() => save("retired")}>Ngừng dùng</Button>}
          {f.id && <Button size="xl" variant="ghost" onClick={() => setF({ ...EMPTY })}>Hủy sửa</Button>}
        </div>
        {!canApprove && <p className="text-xs text-muted-foreground">Chỉ duyệt được khi có tên văn bản, liên kết chính thức và ngày kiểm chứng.</p>}
      </div>
    </Section>
  );
}

function EditPicker({ onPick }: { onPick: (f: Faq) => void }) {
  const { data = [] } = useQuery({ queryKey: ["legal_faqs"], queryFn: async () => ((await supabase.from("legal_faqs").select("*").order("topic")).data ?? []) as Faq[] });
  return (
    <select className="field" value="" onChange={(e) => { const x = data.find((d) => d.id === e.target.value); if (x) onPick(x); }}>
      <option value="">— Chọn mục có sẵn để sửa —</option>
      {data.map((d) => <option key={d.id} value={d.id}>[{STATUS[d.status]}] {d.question.slice(0, 80)}</option>)}
    </select>
  );
}

function PrivateQuestions({ ctx, office }: { ctx: Ctx; office: boolean }) {
  const qc = useQueryClient();
  const { busy, run } = useAction();
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<Record<string, string>>({});
  const { data = [] } = useQuery({
    queryKey: ["legal_questions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("legal_questions").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["legal_questions"] });
  if (ctx.officeView) return null;
  return (
    <Section title={office ? "Câu hỏi riêng gửi cán bộ (không qua AI)" : "Gửi câu hỏi riêng cho cán bộ (không qua AI)"}>
      {!office && (
        <div className="panel space-y-3 p-5">
          <p className="text-sm text-muted-foreground">Chỉ Văn phòng Hội đọc được. Nội dung không gửi tới AI. Chỉ ghi thông tin thật sự cần thiết.</p>
          <textarea className="field min-h-24" maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} />
          <Button size="xl" disabled={busy || body.trim().length < 5} onClick={() =>
            run(() => supabase.from("legal_questions").insert({ body: body.trim(), chapter_id: ctx.chapterId, created_by: "" }), "Đã gửi cho Văn phòng.").then((ok) => { if (ok) { setBody(""); refresh(); } })}>Gửi cho cán bộ</Button>
        </div>
      )}
      {data.length === 0 ? <Empty>Chưa có câu hỏi.</Empty> : (
        <ul className="space-y-3">{data.map((x) => (
          <li key={x.id} className="panel space-y-2 p-4 text-sm">
            <div className="flex flex-wrap gap-2 text-xs"><span className={x.status === "answered" ? "chip chip-ok" : "chip"}>{x.status === "answered" ? "Đã trả lời" : "Chờ trả lời"}</span>
              {x.chapter_id && <ChapterName id={x.chapter_id} chapters={ctx.chapters} />}<span className="text-muted-foreground">{fmtDateTime(x.created_at)}</span></div>
            <p className="whitespace-pre-wrap">{x.body}</p>
            {x.reply && <p className="whitespace-pre-wrap rounded-xl bg-secondary p-3"><b>Trả lời:</b> {x.reply}</p>}
            {office && (
              <div className="flex flex-col gap-2">
                <textarea className="field min-h-20" maxLength={6000} placeholder="Nhập trả lời…" value={reply[x.id] ?? ""} onChange={(e) => setReply({ ...reply, [x.id]: e.target.value })} />
                <Button size="lg" disabled={busy || (reply[x.id] ?? "").trim().length < 2} onClick={() =>
                  run(() => supabase.rpc("answer_legal_question", { _id: x.id, _reply: (reply[x.id] ?? "").trim() }), "Đã trả lời.").then((ok) => { if (ok) { setReply({ ...reply, [x.id]: "" }); refresh(); } })}>Gửi trả lời</Button>
              </div>
            )}
          </li>
        ))}</ul>
      )}
    </Section>
  );
}
