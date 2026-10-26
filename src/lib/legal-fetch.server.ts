import { officialLegalUrl } from "./legal-evidence";

export const LEGAL_MAX_BYTES = 4 * 1024 * 1024;
export function legalRetryable(status: number): boolean { return status === 429 || status >= 500; }

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

/** One retry layer; never retry authorization, quota payment, refusal, or unavailable model. */
export async function legalFetch(url: string, init: RequestInit, timeout: number, source = true): Promise<Response> {
  if (source && !officialLegalUrl(url)) throw new Error("source_not_allowed");
  const deadline = Date.now() + timeout;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let currentUrl = url;
      let currentInit: RequestInit = { ...init };

      for (let redirects = 0; redirects <= 3; redirects++) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error("lookup_unavailable");

        const r = await fetch(currentUrl, {
          ...currentInit,
          redirect: "manual",
          signal: AbortSignal.timeout(remaining),
        });

        if (source && isRedirectStatus(r.status)) {
          await r.body?.cancel();
          if (redirects === 3) throw new Error("source_unavailable");
          const location = r.headers.get("location");
          if (!location) throw new Error("source_unavailable");
          const nextUrl = new URL(location, currentUrl).href;
          if (!officialLegalUrl(nextUrl)) throw new Error("source_not_allowed");
          currentUrl = nextUrl;
          if (r.status === 301 || r.status === 302 || r.status === 303) {
            currentInit = { method: "GET" };
          } else {
            const { headers: _h, ...rest } = currentInit;
            currentInit = rest;
          }
          continue;
        }

        // A provider quota denial is returned immediately: do not spend a second call probing it.
        if (attempt === 0 && legalRetryable(r.status) && (source || r.status !== 429)) {
          const seconds = Number(r.headers.get("retry-after"));
          if (seconds > 3) return r;
          await r.body?.cancel();
          await new Promise((resolve) => setTimeout(resolve, seconds > 0 ? seconds * 1000 : 1000));
          break;
        }
        return r;
      }
    } catch (e) {
      if (e instanceof Error && (e.message === "source_not_allowed" || e.message === "source_unavailable")) {
        throw e;
      }
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