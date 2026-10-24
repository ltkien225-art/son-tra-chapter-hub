import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Scheduled: enqueue due-soon reminders and retry pending notifications.
export const Route = createFileRoute("/api/public/push/cron")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const body = (await request.json().catch(() => ({}))) as { job?: string };
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let reminders = 0;
        if (body.job === "daily") reminders = ((await supabaseAdmin.rpc("enqueue_due_reminders")).data as number) ?? 0;
        const { runPushOutbox } = await import("@/lib/push.server");
        const stats = await runPushOutbox(500);
        return Response.json({ reminders, ...stats });
      },
    },
  },
});
