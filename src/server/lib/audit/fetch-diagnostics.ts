import { sha256Hex } from "@/server/lib/audit/ids";
import type { CrawlerAccess } from "@/shared/crawler-access";

const MAX_FETCH_DIAGNOSTICS = 48;

export type AuditFetchPhase = "robots" | "sitemap" | "crawl";

type FetchOutcome = {
  phase: AuditFetchPhase;
  attempt: number;
  url: string;
  access?: CrawlerAccess | null;
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
  record(outcome: FetchOutcome): void;
};

/**
 * Emits a bounded, safe request timeline for signed audits. The counter is
 * deliberately per workflow invocation: a replay has its own timestamped
 * timeline, while one slow or sitemap-heavy audit cannot flood logs.
 */
export function createAuditFetchDiagnostics(
  auditId: string,
  access: CrawlerAccess | null,
): AuditFetchDiagnostics | undefined {
  if (!access) return undefined;

  let emitted = 0;
  return {
    record(outcome) {
      // Keep the first part of the sequence, but always retain an error after
      // the normal cap so the first observable rate limit is not lost.
      const important = outcome.status === null || outcome.status >= 400;
      if (emitted >= MAX_FETCH_DIAGNOSTICS && !important) return;
      emitted += 1;

      const parsed = new URL(outcome.url);
      const headers = outcome.access?.headers;
      const headerPresence = {
        "Signature-Input": Boolean(headers?.["Signature-Input"]),
        Signature: Boolean(headers?.Signature),
        "Signature-Agent": Boolean(headers?.["Signature-Agent"]),
      };
      const sequence = emitted;
      // The URL path can contain customer data. Hash it asynchronously so
      // diagnostics do not add latency to crawling or retain raw paths.
      void sha256Hex(outcome.url).then((urlFingerprint) => {
        console.info("site_audit:fetch", {
          auditId,
          sequence,
          timestamp: new Date(outcome.startedAt).toISOString(),
          phase: outcome.phase,
          attempt: outcome.attempt,
          hostname: parsed.hostname,
          urlFingerprint: urlFingerprint.slice(0, 16),
          status: outcome.status,
          durationMs: outcome.durationMs,
          signatureAttached: headerPresence.Signature,
          headerPresence,
          redirectOutcome: outcome.redirectLocation
            ? "redirect"
            : "not_followed",
          redirectHostname: outcome.redirectLocation
            ? new URL(outcome.redirectLocation, outcome.url).hostname
            : null,
          retryAfter: outcome.retryAfter,
          cfCacheStatus: outcome.cfCacheStatus,
          requestIds: {
            cfRay: outcome.cfRay,
            requestId: outcome.requestId,
          },
          errorCategory: outcome.errorCategory,
        });
      });
    },
  };
}
