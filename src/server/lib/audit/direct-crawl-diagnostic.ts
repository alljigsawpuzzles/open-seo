import { crawlerHeadersFor, type CrawlerAccess } from "@/shared/crawler-access";

type DirectCrawlDiagnostic = {
  timestamp: string;
  status: number | null;
  durationMs: number;
  signatureAttached: boolean;
  headerPresence: Record<
    "Signature-Input" | "Signature" | "Signature-Agent",
    boolean
  >;
  redirectLocation: string | null;
  retryAfter: string | null;
  cfCacheStatus: string | null;
  requestIds: { cfRay: string | null; requestId: string | null };
  errorCategory: "http_response" | "network" | "timeout";
};

type DiagnosticRequestOptions = {
  method?: "GET" | "HEAD";
  includeAccept?: boolean;
};

type AuditSequenceDiagnostic = {
  robots: DirectCrawlDiagnostic;
  sitemap: DirectCrawlDiagnostic | null;
  homepage: DirectCrawlDiagnostic | null;
  stoppedAfter: "robots" | "sitemap" | null;
};

export async function runDirectCrawlDiagnostic(
  url: string,
  access: CrawlerAccess | null,
  options: DiagnosticRequestOptions = {},
): Promise<DirectCrawlDiagnostic> {
  const crawlerHeaders = crawlerHeadersFor(url, access);
  const hasHeader = (name: string) =>
    typeof crawlerHeaders[name] === "string" && crawlerHeaders[name].length > 0;
  const headerPresence = {
    "Signature-Input": hasHeader("Signature-Input"),
    Signature: hasHeader("Signature"),
    "Signature-Agent": hasHeader("Signature-Agent"),
  };
  const started = Date.now();
  const timestamp = new Date(started).toISOString();
  try {
    const response = await fetch(url, {
      method: options.method,
      headers: {
        "User-Agent": "OpenSEO-Audit/1.0",
        ...(options.includeAccept === false
          ? {}
          : { Accept: "text/html,application/xhtml+xml" }),
        ...crawlerHeaders,
      },
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const location = response.headers.get("location");
    return {
      timestamp,
      status: response.status,
      durationMs: Date.now() - started,
      signatureAttached: headerPresence.Signature,
      headerPresence,
      redirectLocation: location ? new URL(location, url).origin : null,
      retryAfter: response.headers.get("retry-after"),
      cfCacheStatus: response.headers.get("cf-cache-status"),
      requestIds: {
        cfRay: response.headers.get("cf-ray"),
        requestId: response.headers.get("x-request-id"),
      },
      errorCategory: "http_response",
    };
  } catch (error) {
    return {
      timestamp,
      status: null,
      durationMs: Date.now() - started,
      signatureAttached: headerPresence.Signature,
      headerPresence,
      redirectLocation: null,
      retryAfter: null,
      cfCacheStatus: null,
      requestIds: { cfRay: null, requestId: null },
      errorCategory:
        error instanceof Error &&
        (error.name === "AbortError" || error.name === "TimeoutError")
          ? "timeout"
          : "network",
    };
  }
}

/**
 * One pass through the audit worker's discovery requests and first page fetch.
 * It deliberately makes no retries, follows no redirects, and returns no
 * credential values or response bodies.
 */
export async function runAuditSequenceDiagnostic(
  url: string,
  access: CrawlerAccess | null,
): Promise<AuditSequenceDiagnostic> {
  const origin = new URL(url).origin;
  const robots = await runDirectCrawlDiagnostic(
    `${origin}/robots.txt`,
    access,
    {
      includeAccept: false,
    },
  );
  if (robots.status === 429) {
    return { robots, sitemap: null, homepage: null, stoppedAfter: "robots" };
  }
  const sitemap = await runDirectCrawlDiagnostic(
    `${origin}/sitemap.xml`,
    access,
    {
      includeAccept: false,
    },
  );
  if (sitemap.status === 429) {
    return { robots, sitemap, homepage: null, stoppedAfter: "sitemap" };
  }
  return {
    robots,
    sitemap,
    homepage: await runDirectCrawlDiagnostic(url, access),
    stoppedAfter: null,
  };
}
