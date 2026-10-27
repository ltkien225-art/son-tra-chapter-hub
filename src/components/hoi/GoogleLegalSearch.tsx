import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { LEGAL_Q_MAX, validateQuestion } from "@/lib/legal";
import {
  loadGoogleSearch,
  validSearchEngineId,
  type GoogleSearchControl,
} from "@/lib/google-search-element";

/** Same component for the isolated preview and, after review, the Legal panel. */
export function GoogleLegalSearch({ engineId }: { engineId: string }) {
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const resultHost = useRef<HTMLDivElement>(null);
  const control = useRef<GoogleSearchControl | null>(null);
  const alive = useRef(true);
  const inputId = useId();
  const resultName = `hoi-legal-${inputId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const validId = validSearchEngineId(engineId);
  const questionError = question ? validateQuestion(question) : null;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      control.current?.clearAllResults();
      control.current = null;
    };
  }, []);

  async function search(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const invalid = validateQuestion(question);
    setSubmitted(true);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!validId) {
      setError("Chưa có mã công cụ tìm kiếm Google. Không gửi câu hỏi.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const api = await loadGoogleSearch(validId);
      if (!alive.current || !resultHost.current) return;
      if (!control.current) {
        api.render({
          div: resultHost.current,
          tag: "searchresults-only",
          gname: resultName,
          attributes: {
            autoSearchOnLoad: "false",
            enableHistory: "false",
            enableImageSearch: "false",
            linkTarget: "_blank",
            mobileLayout: "enabled",
            ivt: "true",
            noResultsString:
              "Chưa tìm thấy kết quả phù hợp trong các nguồn đã chọn. Hãy thử câu hỏi ngắn hơn.",
          },
        });
        control.current = api.getElement(resultName);
      }
      if (!control.current) throw new Error("Google chưa sẵn sàng. Hãy tải lại trang rồi thử lại.");
      control.current.execute(question.trim());
      setSearched(true);
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : "Chưa kết nối được Google.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  function clear() {
    setQuestion("");
    setError("");
    setSubmitted(false);
    setSearched(false);
    control.current?.clearAllResults();
  }

  return (
    <section className="panel space-y-4 p-5" aria-label="Tìm pháp luật với Google trong ứng dụng">
      <form className="space-y-3" onSubmit={search}>
        <label className="label" htmlFor={inputId}>
          Câu hỏi chung (tối đa {LEGAL_Q_MAX} ký tự)
        </label>
        <textarea
          id={inputId}
          className="field min-h-24"
          maxLength={LEGAL_Q_MAX}
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value);
            setError("");
          }}
          placeholder="Ví dụ: Khi bị bạo lực gia đình có thể báo cho ai?"
          aria-describedby={`${inputId}-privacy`}
        />
        <p id={`${inputId}-privacy`} className="text-sm text-muted-foreground">
          Khi bấm tìm, câu hỏi được gửi tới Google. Không nhập họ tên, số điện thoại, CCCD hoặc chi
          tiết vụ việc riêng.
        </p>
        {!validId && (
          <p role="status" className="rounded-xl bg-secondary p-3 text-sm">
            Chờ chủ tài khoản Google hoàn tất tạo công cụ tìm kiếm. Chưa gửi câu hỏi hoặc gọi AI.
          </p>
        )}
        {(error || (submitted && questionError)) && (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {error || questionError}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            size="xl"
            disabled={busy || !validId || Boolean(questionError) || !question.trim()}
          >
            {busy ? "Đang kết nối Google…" : "Tìm với Google"}
          </Button>
          <Button type="button" size="xl" variant="soft" onClick={clear} disabled={busy}>
            Xóa
          </Button>
        </div>
      </form>
      <div className="min-w-0 border-t border-border pt-4" aria-label="Kết quả tìm kiếm Google">
        <h3 className="font-semibold text-primary">Kết quả Google ngay trong ứng dụng</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Google hiển thị kết quả và đoạn trích từ các trang đã chọn. Đây chưa phải câu trả lời AI;
          khi mở văn bản gốc, trang nguồn mở ở thẻ riêng.
        </p>
        {busy && (
          <p role="status" className="mt-3 text-sm">
            Đang tải công cụ tìm kiếm…
          </p>
        )}
        {searched && (
          <p role="status" className="mt-3 text-sm">
            Đã gửi câu hỏi. Kết quả bên dưới do Google cung cấp.
          </p>
        )}
        <div ref={resultHost} className="mt-3 min-w-0 overflow-x-auto" />
      </div>
    </section>
  );
}
