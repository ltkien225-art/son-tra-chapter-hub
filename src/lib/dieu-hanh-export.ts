/** Aggregate-only reporting contract. Do not expose unit members or private records. */
export const UNIT = "phu-nu" as const;
export type SummaryCounts = {
  tasksTotal: number;
  tasksDone: number;
  reportsExpected: number;
  reportsReceived: number;
};
export function makeSummary(period: string, counts: SummaryCounts, asOf = new Date().toISOString()) {
  if (!/^\\d{4}-\\d{2}$/.test(period)) throw new Error("Invalid period");
  for (const count of Object.values(counts)) {
    if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid count");
  }
  if (counts.tasksDone > counts.tasksTotal || counts.reportsReceived > counts.reportsExpected) {
    throw new Error("Inconsistent summary");
  }
  return { schemaVersion: 1 as const, unit: UNIT, period, asOf, metrics: { ...counts } };
}
/** Pending: authenticated server endpoint and verified DB aggregate queries. */
