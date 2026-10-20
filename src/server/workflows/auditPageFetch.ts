import { inspectAuditRejection } from "@/server/lib/audit/rejection-details";
import type { CrawlThrottle } from "@/server/lib/audit/crawl-throttle";
import type { AuditFetchDiagnostics } from "@/server/lib/audit/fetch-diagnostics";

const CRAWL_USER_AGENT = "OpenSEO-Audit/1.0";

/**
 * Fetch one URL, pausing the whole chunk and retrying while the site 429s
 * (see crawl-throttle.ts). `responseTimeMs` is measured from the last attempt
 * so backoff waiting never looks like a slow server.
 */
export async function fetchAuditPage(
  url: string,
  throttle: CrawlThrottle,
  crawlerHeaders: Record<string, string>,
  diagnostics?: AuditFetchDiagnostics,
  /** Hand a Shopify 429 to rendering without backing off first. */
  skipBackoff = false,
) {
  for (let attempt = 1; ; attempt++) {
    if (!(await throttle.ready())) return null;
    const startedAt = Date.now();
    // Manual redirect handling: each hop is recorded as its own page row and
    // its target is enqueued by the frontier, so redirect chains and loops are
    // detectable from the recorded rows. Trailing-slash redirects (/docs ->
    // /docs/) need no special handling: normalizeUrl preserves trailing
    // slashes, so /docs and /docs/ are distinct URLs and the redirect resolves
    // to its canonical target instead of cycling back to its own source.
    const request = diagnostics?.begin?.();
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": CRAWL_USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          ...crawlerHeaders,
        },
        redirect: "manual",
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      diagnostics?.record({
        phase: "crawl",
        request,
        attempt,
        url,
        requestHeaders: crawlerHeaders,
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
      requestHeaders: crawlerHeaders,
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
      // A retry means an earlier attempt was 429'd; a 429 handed back after
      // the last retry is already classified rate_limited and needs no flag.
      rateLimited: attempt > 1,
    };
    // An explicit Retry-After still applies even when a rate-limit rule
    // issues a challenge. Without that hint, hand the challenge to the
    // existing blocked-page/rendering path instead of repeating it for minutes.
    const challengeWithoutCooldown =
      response.headers.get("cf-mitigated") === "challenge" &&
      !response.headers.get("retry-after");
    if (response.status !== 429 || challengeWithoutCooldown) {
      await throttle.recovered();
      return result;
    }
    if (skipBackoff) return result;

    const retry = await throttle.backoff(
      attempt,
      response.headers.get("retry-after"),
    );
    // The shared cooldown applies even when this URL has no retries left.
    if (!retry) return result;
    await response.body?.cancel();
  }
}
