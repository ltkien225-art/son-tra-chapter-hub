import type { LegalSource } from "./legal-evidence";

export const LEGAL_SOURCE_TTL_MS = 10 * 60 * 1000;
type PublicSource = Omit<LegalSource, "id">;

/** Only fixed public search topics, never questions, answers, sessions or private records. */
export function createLegalSourceCache() {
  const entries = new Map<string, { expires: number; sources: PublicSource[] }>();
  const pending = new Map<string, Promise<PublicSource[]>>();
  return async (topic: string, load: () => Promise<PublicSource[]>): Promise<PublicSource[]> => {
    if (!["marriage", "civil-status", "domestic-violence"].includes(topic)) return load();
    const now = Date.now();
    const cached = entries.get(topic);
    if (cached && cached.expires > now) return structuredClone(cached.sources);
    const ongoing = pending.get(topic);
    if (ongoing) return structuredClone(await ongoing);
    const request = load().then((sources) => {
      // Never cache failures or metadata-only results. Keep original retrieval timestamps.
      if (sources.some((s) => s.kind === "text")) entries.set(topic, { expires: Date.now() + LEGAL_SOURCE_TTL_MS, sources: structuredClone(sources) });
      return sources;
    }).finally(() => pending.delete(topic));
    pending.set(topic, request);
    return structuredClone(await request);
  };
}