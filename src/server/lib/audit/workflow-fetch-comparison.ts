import { createHash } from "node:crypto";
import { readTextUpTo } from "./html-response";
import { crawlerHeadersFor, type CrawlerAccess } from "@/shared/crawler-access";

/** Private operator diagnostic: two requests at most, no retries or redirects. */
export async function compareWorkflowFetch(url: string, access: CrawlerAccess) {
  const target = new URL("/robots.txt", url).toString();
  const headers = crawlerHeadersFor(target, access);
  if (!headers.Signature)
    throw new Error("Diagnostic requires matching signed access");
  async function request(noStore: boolean) {
    const started = Date.now();
    const response = await fetch(target, {
      headers: { "User-Agent": "OpenSEO-Audit/1.0", ...headers },
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      ...(noStore ? { cache: "no-store" as const } : {}),
    });
    const responseTimeMs = Date.now() - started;
    const body =
      response.status === 429 ? await readTextUpTo(response, 4096) : "";
    if (response.status !== 429) await response.body?.cancel();
    return {
      timestamp: new Date(started).toISOString(),
      httpStatus: response.status,
      responseTimeMs,
      noStore,
      signatureAttached: true,
      headers: {
        server: response.headers.get("server"),
        contentType: response.headers.get("content-type"),
        contentLength: response.headers.get("content-length"),
        cfRay: response.headers.get("cf-ray"),
        cfCacheStatus: response.headers.get("cf-cache-status"),
        cfMitigated: response.headers.get("cf-mitigated"),
        requestId: response.headers.get("x-request-id"),
        retryAfter: response.headers.get("retry-after"),
        cacheControl: response.headers.get("cache-control"),
        age: response.headers.get("age"),
      },
      rejection:
        response.status === 429
          ? {
              bodyFingerprint: createHash("sha256")
                .update(body)
                .digest("hex")
                .slice(0, 16),
              cloudflareErrorCode:
                body.match(
                  /(?:error\s*(?:code)?[:\s]*|data-translate="code_)(1\d{3})/i,
                )?.[1] ?? null,
              cloudflare: /cloudflare/i.test(body),
              shopify: /shopify/i.test(body),
              challenge: /cf-chl|challenge-platform|just a moment/i.test(body),
              rateLimit: /too many requests|rate.limit|error.*1015/i.test(body),
            }
          : null,
    };
  }
  const normal = await request(false);
  return {
    credentialFingerprint: createHash("sha256")
      .update(
        `crawler-access-v1\0${headers["Signature-Input"]}\0${headers.Signature}`,
      )
      .digest("hex")
      .slice(0, 16),
    normal,
    noStore: normal.httpStatus === 429 ? await request(true) : null,
  };
}
