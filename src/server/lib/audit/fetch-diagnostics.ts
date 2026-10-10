import { createHash } from "node:crypto";

const MAX_SUCCESS_DIAGNOSTICS = 48;
const MAX_ERROR_DIAGNOSTICS = 48;

export type AuditFetchPhase = "probe" | "robots" | "sitemap" | "crawl";

type RequestTiming = {
  sequence: number;
  inFlightAtStart: number;
};

type FetchOutcome = {
  phase: AuditFetchPhase;
  attempt: number;
  redirectHop?: number;
  request?: RequestTiming;
  url: string;
  requestHeaders: Record<string, string>;
  startedAt: number;
  durationMs: number;
  status: number | null;
  redirectLocation: string | null;
  retryAfter: string | null;
  cfCacheStatus: string | null;
  cfRay: string | null;
  requestId: string | null;
  errorCategory: "http_response" | "network" | "timeout";
};

export type AuditFetchDiagnostics = {
  begin?(): RequestTiming;
  record(outcome: FetchOutcome): void;
};

/** Safe metadata only; logging is synchronous so Workflow completion cannot drop it. */
export function createAuditFetchDiagnostics(
  auditId: string,
): AuditFetchDiagnostics {
  let started = 0;
  let active = 0;
  let successes = 0;
  let errors = 0;
  return {
    begin() {
      return { sequence: ++started, inFlightAtStart: ++active };
    },
    record(outcome) {
      if (outcome.request) active = Math.max(0, active - 1);
      const important = outcome.status === null || outcome.status >= 400;
      if (
        important
          ? errors++ >= MAX_ERROR_DIAGNOSTICS
          : successes++ >= MAX_SUCCESS_DIAGNOSTICS
      )
        return;
      // Diagnostic parsing must never change the request's control flow.
      try {
        const parsed = new URL(outcome.url);
        const headers = new Headers(outcome.requestHeaders);
        let redirectHostname: string | null = null;
        if (outcome.redirectLocation) {
          try {
            redirectHostname = new URL(outcome.redirectLocation, outcome.url)
              .hostname;
          } catch {
            /* malformed Location remains observable as a redirect */
          }
        }
        console.info("site_audit:fetch", {
          auditId,
          sequence: outcome.request?.sequence,
          inFlightAtStart: outcome.request?.inFlightAtStart,
          timestamp: new Date(outcome.startedAt).toISOString(),
          phase: outcome.phase,
          method: outcome.phase === "probe" ? "HEAD" : "GET",
          attempt: outcome.attempt,
          redirectHop: outcome.redirectHop ?? 0,
          hostname: parsed.hostname,
          urlFingerprint: createHash("sha256")
            .update(outcome.url)
            .digest("hex")
            .slice(0, 16),
          status: outcome.status,
          durationMs: outcome.durationMs,
          signatureAttached: headers.has("Signature"),
          headerPresence: {
            "Signature-Input": headers.has("Signature-Input"),
            Signature: headers.has("Signature"),
            "Signature-Agent": headers.has("Signature-Agent"),
          },
          redirectOutcome: outcome.redirectLocation
            ? "redirect"
            : "not_followed",
          redirectHostname,
          retryAfter: outcome.retryAfter,
          cfCacheStatus: outcome.cfCacheStatus,
          requestIds: { cfRay: outcome.cfRay, requestId: outcome.requestId },
          errorCategory: outcome.errorCategory,
        });
      } catch {
        console.warn("site_audit:diagnostic_unavailable", {
          auditId,
          phase: outcome.phase,
        });
      }
    },
  };
}
