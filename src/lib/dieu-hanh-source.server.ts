import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { makeSummary } from "./dieu-hanh-export";

export async function readAggregate(period: string) {
  const start = period + "-01";
  const [year, month] = period.split("-").map(Number);
  if (year === undefined || month === undefined || !Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12)
    throw new Error("Invalid period");
  const end = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const [tasks, assignments, chapters, reports] = await Promise.all([
    supabaseAdmin.from("tasks").select("id", { count: "exact", head: true })
      .eq("is_test", false).neq("status", "withdrawn").gte("created_at", start).lt("created_at", end),
    supabaseAdmin.from("task_assignments").select("task_id, tasks!inner(created_at,is_test,status)")
      .eq("status", "completed").eq("tasks.is_test", false).neq("tasks.status", "withdrawn")
      .gte("tasks.created_at", start).lt("tasks.created_at", end),
    supabaseAdmin.from("chapters").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("submissions").select("chapter_id").eq("is_test", false)
      .eq("kind", "report").eq("period", period).neq("status", "withdrawn"),
  ]);
  if (tasks.error || assignments.error || chapters.error || reports.error) throw new Error("Aggregate query failed");
  const taskCount = tasks.count ?? 0;
  const done = new Set((assignments.data ?? []).map(x => x.task_id)).size;
  const expected = chapters.count ?? 0;
  const received = new Set((reports.data ?? []).map(x => x.chapter_id)).size;
  return makeSummary(period, {
    tasksTotal: taskCount, tasksDone: Math.min(done, taskCount),
    reportsExpected: expected, reportsReceived: Math.min(received, expected),
  });
}
