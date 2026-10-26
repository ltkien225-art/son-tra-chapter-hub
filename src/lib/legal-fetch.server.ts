import { officialLegalUrl } from "./legal-evidence";

export const LEGAL_MAX_BYTES = 4 * 1024 * 1024;
export function legalRetryable(status: number): boolean { return status === 429 || status >= 500; }

export async function legalFetch(url: string, init: RequestInit, timeout: number, source = true, redirects = 0): Promise<Response> {
  if (source && !officialLegalUrl(url)) throw new Error("source_not_allowed");
  if (redirects > 3) throw new Error("too_many_redirects");

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(timeout) });
      
      if (r.status >= 300 && r.status < 400) {
        const location = r.headers.get("location");
        if (location) {
          const nextUrl = new URL(location, url).href;
          return legalFetch(nextUrl, init, timeout, source, redirects + 1);
        }
      }

      if (attempt === 0 && legalRetryable(r.status) && (source || r.status !== 429)) {
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