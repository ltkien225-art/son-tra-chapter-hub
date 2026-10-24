import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Any signed-in user with current permission can trigger delivery of the pending outbox (idempotent). */
export const flushPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("my_access");
    const a = data as { office: boolean; chapters: string[] } | null;
    if (!a || (!a.office && !a.chapters?.length)) throw new Error("forbidden");
    const { runPushOutbox } = await import("./push.server");
    return runPushOutbox(200);
  });
