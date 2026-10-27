import { createFileRoute } from "@tanstack/react-router";
import { BrandLogo } from "@/components/hoi/BrandLogo";
import { GoogleLegalSearch } from "@/components/hoi/GoogleLegalSearch";
import { LEGAL_SEARCH_ENGINE_ID, validSearchEngineId } from "@/lib/google-search-element";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/xem-thu-google")({
  validateSearch: (search: Record<string, unknown>) => ({ cx: validSearchEngineId(search["cx"]) }),
  head: () => ({
    meta: [
      { title: "Xem thử tìm kiếm Google · Hội LHPN Sơn Trà" },
      { name: "description", content: "Bản xem trước tìm kiếm pháp luật Google trong Bộ công cụ Hội LHPN Sơn Trà, không truy cập hồ sơ riêng." },
      { property: "og:title", content: "Xem thử tìm kiếm Google · Hội LHPN Sơn Trà" },
      { property: "og:description", content: "Kiểm tra ô tìm kiếm và kết quả Google ngay trong Bộ công cụ Hội LHPN Sơn Trà." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "origin" },
    ],
  }),
  component: GooglePreview,
});

function GooglePreview() {
  const search = Route.useSearch();
  const cx = search.cx || LEGAL_SEARCH_ENGINE_ID;
  return (
    <div className="min-h-screen bg-background">
      <header className="hero-lotus px-5 py-8">
        <div className="mx-auto max-w-5xl">
          <BrandLogo />
          <p className="text-xs font-semibold tracking-wider">
            HỘI LIÊN HIỆP PHỤ NỮ PHƯỜNG SƠN TRÀ
          </p>
          <h1 className="mt-3 text-3xl font-bold">Hỏi đáp pháp luật</h1>
          <p className="mt-2">Xem thử tìm kiếm Google ngay trong bộ công cụ</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-5">
        <p className="rounded-xl border border-primary/20 bg-secondary p-4 text-sm">
          Trang thử kết nối thật, không có kết quả minh họa. Không đọc dữ liệu Văn phòng hoặc Sổ Chi
          hội. Bản đang sử dụng được giữ nguyên trong lúc bác kiểm tra.
        </p>
        {!cx && (
          <section className="panel space-y-3 p-5" aria-labelledby="setup-title">
            <h2 id="setup-title" className="text-lg font-bold text-primary">
              Hoàn tất kết nối Google một lần
            </h2>
            <p className="text-sm">
              Sau khi tạo công cụ tìm kiếm, sao chép “Mã công cụ tìm kiếm” của Google vào ô dưới.
              Đây là mã công khai, không phải khóa Gemini hoặc liên kết Văn phòng.
            </p>
            <form action="/xem-thu-google" method="get" className="flex flex-col gap-3 sm:flex-row">
              <input
                name="cx"
                aria-label="Mã công cụ tìm kiếm Google"
                className="field flex-1"
                required
                minLength={8}
                maxLength={100}
                pattern="[a-zA-Z0-9:_\-]{8,100}"
                autoComplete="off"
                placeholder="Mã công cụ tìm kiếm Google"
              />
              <Button
                type="submit"
                className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
              >
                Kết nối để xem thử
              </Button>
            </form>
          </section>
        )}
        <GoogleLegalSearch key={cx} engineId={cx} />
      </main>
    </div>
  );
}
