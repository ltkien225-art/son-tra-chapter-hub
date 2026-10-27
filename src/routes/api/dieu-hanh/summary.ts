import { createFileRoute } from "@tanstack/react-router";
import { createServerOnlyFn } from "@tanstack/react-start";
import { readAggregate } from "@/lib/dieu-hanh-source.server";

const get = createServerOnlyFn(async (request: Request) => {
  const token = process.env["DIEU_HANH_EXPORT_TOKEN"];
  if (!token || token.length < 32 || request.headers.get("authorization") !== `Bearer ${token}`) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const period = new URL(request.url).searchParams.get("period") ?? "";
  if (!/^\d{4}-\d{2}$/.test(period)) return Response.json({ error: "Invalid period" }, { status: 400 });
  try {
    const summary = await readAggregate(period);
    return Response.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Source unavailable" }, { status: 503 });
  }
});
export const Route = createFileRoute("/api/dieu-hanh/summary")({
  server: { handlers: { GET: ({ request }) => get(request) } },
});
