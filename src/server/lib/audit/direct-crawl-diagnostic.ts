import { crawlerHeadersFor, type CrawlerAccess } from "@/shared/crawler-access";

export type DirectCrawlDiagnostic = {
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

export async function runDirectCrawlDiagnostic(
  url: string,
  access: CrawlerAccess | null,
): Promise<DirectCrawlDiagnostic> {
  const crawlerHeaders = crawlerHeadersFor(url, access);
  const headerPresence = Object.fromEntries(
    ["Signature-Input", "Signature", "Signature-Agent"].map((name) => [
      name,
      typeof crawlerHeaders[name] === "string" &&
        crawlerHeaders[name].length > 0,
    ]),
  ) as DirectCrawlDiagnostic["headerPresence"];
  const started = Date.now();
  const timestamp = new Date(started).toISOString();
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "OpenSEO-Audit/1.0",
        Accept: "text/html,application/xhtml+xml",
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
