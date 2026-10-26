import { officialLegalUrl } from "./legal-evidence";

export const LEGAL_MAX_BYTES = 4 * 1024 * 1024;
export function legalRetryable(status: number): boolean { return status === 429 || status >= 500; }

/** One retry layer; never retry authorization, quota payment, refusal, or unavailable model. */
export async function legalFetch(url: string, init: RequestInit, timeout: number, source = true): Promise<Response> {
  if (source && !officialLegalUrl(url)) throw new Error("source_not_allowed");
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(timeout) });
      if (attempt === 0 && legalRetryable(r.status)) {
        const seconds = Number(r.headers.get("retry-after"));
        if (seconds > 3) return r;
        await r.body?.cancel();
        await new Promise((resolve) => setTimeout(resolve, seconds > 0 ? seconds * 1000 : 1000));
        continue;
      }
      return r;
    } catch (e) {
      if (attempt > 0) throw e;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error("lookup_unavailable");
}

export async function legalBytes(r: Response): Promise<Uint8Array> {
  if (!r.ok || Number(r.headers.get("content-length") ?? 0) > LEGAL_MAX_BYTES) throw new Error("source_unavailable");
  const reader = r.body?.getReader(); if (!reader) throw new Error("empty_source");
  const parts: Uint8Array[] = []; let total = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    total += value.length;
    if (total > LEGAL_MAX_BYTES) { await reader.cancel(); throw new Error("source_too_large"); }
    parts.push(value);
  }
  const out = new Uint8Array(total); let pos = 0;
  for (const part of parts) { out.set(part, pos); pos += part.length; }
  return out;
}