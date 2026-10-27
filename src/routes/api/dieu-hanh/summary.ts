import { createFileRoute } from "@tanstack/react-router";
import { createServerOnlyFn } from "@tanstack/react-start";
import { makeSummary } from "@/lib/dieu-hanh-export";

const get = createServerOnlyFn(async (request: Request) => {
  const token = process.env["DIEU_HANH_EXPORT_TOKEN"];
  if (!token || token.length < 32 || request.headers.get("authorization") !== `Bearer ${token}`) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const period = new URL(request.url).searchParams.get("period") ?? "";
  if (!/^\d{4}-\d{2}$/.test(period)) return Response.json({ error: "Invalid period" }, { status: 400 });
  // Fail closed until aggregate source queries are reviewed and enabled.
  void makeSummary;
  return Response.json({ error: "Source not configured" }, { status: 503 });
});
export const Route = createFileRoute("/api/dieu-hanh/summary")({
  server: { handlers: { GET: ({ request }) => get(request) } },
});
