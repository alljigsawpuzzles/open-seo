import { inspectAuditRejection } from "@/server/lib/audit/rejection-details";
import { readTextUpTo } from "@/server/lib/audit/html-response";
import type { CrawlThrottle } from "@/server/lib/audit/crawl-throttle";
import type { AuditFetchDiagnostics } from "@/server/lib/audit/fetch-diagnostics";
import { publicFetch } from "@/server/lib/public-fetch";
import { crawlerHeadersFor, type CrawlerAccess } from "@/shared/crawler-access";
import { auditRequestHeaders } from "@/server/lib/audit/web-bot-auth";

/**
 * One warning per 429 so production shows what the edge answers: the
 * Retry-After, how fast it came back (Shopify refuses at its edge within
 * milliseconds), whether the request carried a crawler signature, and the
 * body's first words (Shopify writes `local_rate_limited`).
 */
async function logRateLimited(input: {
  url: string;
  response: Response;
  responseTimeMs: number;
  attempt: number;
  signed: boolean;
}) {
  const { url, response, responseTimeMs, attempt, signed } = input;
  let body = "";
  try {
    body = (await readTextUpTo(response.clone(), 80)).trim();
  } catch {
    // The snippet is only context for the log line.
  }
  console.warn("site_audit:rate_limited", {
    url,
    attempt,
    signed,
    responseTimeMs,
    retryAfter: response.headers.get("retry-after"),
    cfCacheStatus: response.headers.get("cf-cache-status"),
    xRequestId: response.headers.get("x-request-id"),
    cfRay: response.headers.get("cf-ray"),
    body,
  });
}

/**
 * Fetch one URL, pausing the whole chunk and retrying while the site 429s
 * (see crawl-throttle.ts). `responseTimeMs` is measured from the last attempt
 * so backoff waiting never looks like a slow server.
 */
export async function fetchAuditPage(
  url: string,
  throttle: CrawlThrottle,
  access: CrawlerAccess | null | undefined,
  diagnostics?: AuditFetchDiagnostics,
  /** Hand a Shopify 429 to rendering without backing off first. */
  skipBackoff = false,
) {
  for (let attempt = 1; ; attempt++) {
    if (!(await throttle.ready())) return null;
    const startedAt = Date.now();
    const request = diagnostics?.begin?.();
    const requestHeaders = {
      Accept: "text/html,application/xhtml+xml",
      ...(await auditRequestHeaders(url, access)),
    };
    let response: Response;
    try {
      response = await publicFetch(url, {
        headers: requestHeaders,
        redirect: "manual",
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      diagnostics?.record({
        phase: "crawl",
        request,
        attempt,
        url,
        requestHeaders,
        startedAt,
        durationMs: Date.now() - startedAt,
        status: null,
        redirectLocation: null,
        retryAfter: null,
        cfCacheStatus: null,
        cfRay: null,
        requestId: null,
        errorCategory:
          error instanceof Error &&
          (error.name === "AbortError" || error.name === "TimeoutError")
            ? "timeout"
            : "network",
      });
      throw error;
    }
    diagnostics?.record({
      phase: "crawl",
      request,
      attempt,
      url,
      requestHeaders,
      startedAt,
      durationMs: Date.now() - startedAt,
      status: response.status,
      rejection:
        diagnostics && response.status === 429
          ? await inspectAuditRejection(response)
          : undefined,
      redirectLocation: response.headers.get("location"),
      retryAfter: response.headers.get("retry-after"),
      cfCacheStatus: response.headers.get("cf-cache-status"),
      cfRay: response.headers.get("cf-ray"),
      requestId: response.headers.get("x-request-id"),
      errorCategory: "http_response",
    });
    const result = {
      response,
      responseTimeMs: Date.now() - startedAt,
      rateLimited: attempt > 1,
    };
    const challengeWithoutCooldown =
      response.headers.get("cf-mitigated") === "challenge" &&
      !response.headers.get("retry-after");
    if (response.status !== 429 || challengeWithoutCooldown) {
      await throttle.recovered(url);
      return result;
    }
    await logRateLimited({
      url,
      response,
      responseTimeMs: result.responseTimeMs,
      attempt,
      signed: Object.keys(crawlerHeadersFor(url, access)).length > 0,
    });
    if (skipBackoff) return result;

    const retry = await throttle.backoff(
      url,
      response.headers.get("retry-after"),
    );
    if (!retry) return result;
    await response.body?.cancel();
  }
}
