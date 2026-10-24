import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Private file gateway: every request re-checks the caller's CURRENT permission
// (attachments RLS -> can_read_owner) before streaming bytes. Nothing is cached.
const NO_STORE = { "Cache-Control": "no-store, private, max-age=0", "X-Content-Type-Options": "nosniff" };

export const Route = createFileRoute("/api/files/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401, headers: NO_STORE });
        if (!/^[0-9a-f-]{36}$/.test(params.id)) return new Response("Not found", { status: 404, headers: NO_STORE });
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const user = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: u, error: ue } = await user.auth.getUser(token);
        if (ue || !u.user) return new Response("Unauthorized", { status: 401, headers: NO_STORE });
        const { data: att } = await user.from("attachments").select("path,filename,mime").eq("id", params.id).maybeSingle();
        if (!att) return new Response("Forbidden", { status: 403, headers: NO_STORE });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: blob, error } = await supabaseAdmin.storage.from("evidence").download(att.path);
        if (error || !blob) return new Response("Not found", { status: 404, headers: NO_STORE });
        const dl = new URL(request.url).searchParams.get("download") === "1";
        return new Response(blob, {
          headers: {
            ...NO_STORE,
            "Content-Type": att.mime,
            "Content-Disposition": `${dl ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(att.filename)}`,
          },
        });
      },
    },
  },
});
