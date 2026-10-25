import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CodeLogin } from "@/components/hoi/CodeLogin";
import { useHoiSession } from "@/hooks/use-hoi-session";
import { UNIT_RE, unitLabel } from "@/lib/units";

export const Route = createFileRoute("/so/$unit")({
  loader: ({ params }) => {
    if (!UNIT_RE.test(params.unit)) throw notFound();
    return { unit: params.unit };
  },
  head: ({ loaderData }) => {
    const name = loaderData ? unitLabel(loaderData.unit) : "Sổ Chi hội";
    const title = `${loaderData?.unit === "office" ? name : "Sổ " + name} · Hội LHPN Sơn Trà`;
    const desc = `Lối vào riêng của ${name} — nhập mã truy cập do Văn phòng Hội cấp.`;
    return {
      meta: [
        { title }, { name: "description", content: desc }, { name: "robots", content: "noindex" },
        { property: "og:title", content: title }, { property: "og:description", content: desc },
        { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
        { name: "apple-mobile-web-app-title", content: name },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="p-10 text-center">Không tìm thấy đơn vị. <Link to="/" className="text-primary underline">Về trang đầu</Link></div>
  ),
  component: UnitEntry,
});

function UnitEntry() {
  const { unit } = Route.useLoaderData();
  const { session, ready } = useHoiSession();
  const navigate = useNavigate();
  useEffect(() => { if (ready && session) navigate({ to: "/app" }); }, [ready, session, navigate]);
  return (
    <div className="min-h-screen bg-background">
      <header className="hero-lotus px-5 py-8">
        <div className="mx-auto max-w-md">
          <p className="text-xs font-semibold tracking-[0.18em] opacity-90">HỘI LHPN PHƯỜNG SƠN TRÀ</p>
          <h1 className="mt-2 text-2xl font-bold">✿ {unit === "office" ? "Văn phòng Hội" : `Sổ ${unitLabel(unit)}`}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-md space-y-4 px-5 py-6">
        <section className="panel p-5"><CodeLogin unit={unit} /></section>
        <p className="panel p-4 text-sm text-muted-foreground">
          Mẹo: sau khi vào được, trên iPhone bấm nút Chia sẻ → “Thêm vào MH chính”; trên Android bấm ⋮ → “Thêm vào màn hình chính” để lần sau mở nhanh.
        </p>
        <Link to="/" className="block text-center text-sm text-primary underline">Chọn đơn vị khác</Link>
      </main>
    </div>
  );
}
