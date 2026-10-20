import { z } from "zod";
import type {
  BrowserRun,
  Response as BrowserResponse,
} from "@cloudflare/workers-types";
import {
  CLOUDFLARE_RENDER_TIMEOUT_MS,
  type RenderUsage,
} from "@/shared/audit-rendering";
import { classifyFetch } from "./classify-fetch";
import { MAX_HTML_BYTES, readTextUpTo, truncateToBytes } from "./html-response";
import { isCrawlableUrl } from "./url-policy";
import { normalizeUrl } from "./url-utils";

type RenderOptions = {
  // Either renderer may be missing: Docker has no browser binding, and the
  // Context key is optional on self-hosted Cloudflare deployments.
  browser?: Pick<BrowserRun, "quickAction">;
  contextApiKey?: string;
  /** Logged with each attempt; reads outside an audit have none. */
  auditId?: string;
  // Counts every provider attempt, including rejected ones: both providers
  // bill a request whether or not the HTML turned out to be usable.
  usage: RenderUsage;
};

const cloudflareSchema = z.object({
  success: z.literal(true),
  result: z.string(),
  meta: z.object({
    status: z.number().int(),
    finalUrl: z.string().url(),
    headers: z.record(z.string(), z.string()).optional(),
  }),
});
// Context includes key_metadata on every authenticated response, error or not.
const usageSchema = z.object({
  key_metadata: z
    .object({ credits_consumed: z.number().nonnegative().optional() })
    .optional(),
});
const contextSchema = z.object({
  success: z.literal(true),
  type: z.literal("html"),
  html: z.string(),
  metadata: z.object({ finalUrl: z.string().url() }),
  finalDOMState: z.literal("loaded"),
});

// JSON escaping can expand an HTML byte up to sixfold. Bound the transport
// before JSON.parse as well as the decoded HTML before it reaches the parser.
// A body cut off at the bound is incomplete JSON, so parsing rejects it.
const MAX_RESPONSE_BYTES = 8 * MAX_HTML_BYTES;
async function readProviderJson(
  response: Response | BrowserResponse,
): Promise<unknown> {
  return JSON.parse(await readTextUpTo(response, MAX_RESPONSE_BYTES));
}

/**
 * The rendered HTML to analyze: the same first 1 MiB the direct crawl keeps,
 * which still holds the metadata and navigation the audit reads.
 */
function usableHtml(url: string, finalUrl: string, html: string) {
  // The existing direct fetch records redirects one hop at a time. A browser
  // must not silently substitute another URL's content into this page row.
  if (normalizeUrl(finalUrl, url) !== normalizeUrl(url, url)) {
    throw new Error("Rendering returned a different URL");
  }
  if (!html.trim()) throw new Error("Rendered HTML is empty");
  return truncateToBytes(html, MAX_HTML_BYTES);
}

/** The rendered HTML, with the origin's status when the renderer reports it. */
export type RenderedPage = { html: string; status: number | null };

type CloudflareRenderDiagnostic = {
  reason?:
    | "provider-http"
    | "invalid-response"
    | "different-url"
    | "empty-html"
    | "blocked"
    | "origin-error"
    | "provider-exception";
  providerHttpStatus?: number;
  originStatus?: number;
  cfRay?: string;
  blockProvider?: "filtrex";
};

/** Null when Cloudflare failed, was blocked, or saw an origin error. */
async function renderWithCloudflare(
  url: string,
  browser: Pick<BrowserRun, "quickAction">,
  diagnostic: CloudflareRenderDiagnostic,
): Promise<RenderedPage | null> {
  try {
    const response = await browser.quickAction("content", {
      url,
      cacheTTL: 0,
      gotoOptions: {
        waitUntil: "networkidle2",
        timeout: CLOUDFLARE_RENDER_TIMEOUT_MS,
      },
    });
    diagnostic.providerHttpStatus = response.status;
    if (!response.ok) {
      diagnostic.reason = "provider-http";
      await response.body?.cancel();
      return null;
    }
    const parsed = cloudflareSchema.safeParse(await readProviderJson(response));
    if (!parsed.success) {
      diagnostic.reason = "invalid-response";
      return null;
    }
    const data = parsed.data;
    const { status, finalUrl, headers } = data.meta;
    diagnostic.originStatus = status;
    const ray = Object.entries(headers ?? {}).find(
      ([name]) => name.toLowerCase() === "cf-ray",
    )?.[1];
    if (ray && /^[a-f0-9]{16,32}-[A-Z]{3}$/.test(ray)) diagnostic.cfRay = ray;
    if (normalizeUrl(finalUrl, url) !== normalizeUrl(url, url)) {
      if (new URL(finalUrl).pathname === "/apps/filtrex/block") {
        diagnostic.blockProvider = "filtrex";
        diagnostic.reason = "blocked";
      } else diagnostic.reason = "different-url";
      return null;
    }
    if (!data.result.trim()) {
      diagnostic.reason = "empty-html";
      return null;
    }
    const mitigated = Object.entries(headers ?? {}).some(
      ([name, value]) =>
        name.toLowerCase() === "cf-mitigated" && Boolean(value.trim()),
    );
    const fetchClass = classifyFetch(
      status,
      mitigated,
      data.result.slice(0, 4_000),
    );
    if (status >= 400 || fetchClass !== "ok") {
      diagnostic.reason = fetchClass === "blocked" ? "blocked" : "origin-error";
      return null;
    }
    return { html: truncateToBytes(data.result, MAX_HTML_BYTES), status };
  } catch {
    // Never log provider payloads, exception messages, cookies or credential headers.
    diagnostic.reason = "provider-exception";
    return null;
  }
}

async function renderWithContext(
  url: string,
  contextApiKey: string,
): Promise<{
  html: string | null;
  credits: number;
  httpStatus: number | null;
}> {
  const endpoint = new URL("https://api.context.dev/v1/web/scrape/html");
  endpoint.search = new URLSearchParams({
    url,
    maxAgeMs: "0",
    useMainContentOnly: "false",
    waitForMs: "1000",
    "pdf[shouldParse]": "false",
    "timeoutOpts[milliseconds]": "30000",
    "timeoutOpts[behavior]": "fail",
  }).toString();

  let html: string | null = null;
  let creditsUsed: number | null = null;
  let httpStatus: number | null = null;
  try {
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${contextApiKey}` },
      signal: AbortSignal.timeout(35_000),
    });
    httpStatus = response.status;
    const json = await readProviderJson(response);
    // Usage first: a rejected or partial document still cost a credit.
    const usage = usageSchema.safeParse(json);
    creditsUsed = usage.success
      ? (usage.data.key_metadata?.credits_consumed ?? null)
      : null;
    if (!response.ok) throw new Error(`Rendering provider HTTP ${httpStatus}`);
    const data = contextSchema.parse(json);
    html = usableHtml(url, data.metadata.finalUrl, data.html);
  } catch {
    // Provider bodies/errors can contain page data or credentials. Nothing
    // raw is logged, and a paid call is never retried automatically.
  }
  // Context charges one credit per scrape. Bill what it reports; only assume
  // one credit for a usable page that omits its usage, never for a failure.
  return { html, credits: creditsUsed ?? (html ? 1 : 0), httpStatus };
}

/**
 * Cloudflare Browser Run first, because it costs a fraction of Context. Context
 * renders only the pages Cloudflare could not: a failure, a bot challenge, or
 * an origin error.
 */
async function renderPage(
  url: string,
  options: RenderOptions,
): Promise<RenderedPage> {
  if (!isCrawlableUrl(url) || new URL(url).username || new URL(url).password) {
    throw new Error("Invalid rendering target");
  }

  if (options.browser) {
    const diagnostic: CloudflareRenderDiagnostic = {};
    const page = await renderWithCloudflare(url, options.browser, diagnostic);
    options.usage.cloudflareAttempts += 1;
    console.info("site_audit:render", {
      auditId: options.auditId,
      provider: "cloudflare",
      outcome: page ? "ok" : "fallback",
      ...diagnostic,
    });
    if (page) return page;
  }

  if (options.contextApiKey) {
    const { html, credits, httpStatus } = await renderWithContext(
      url,
      options.contextApiKey,
    );
    options.usage.contextCredits += credits;
    console.info("site_audit:render", {
      auditId: options.auditId,
      provider: "context",
      httpStatus,
      creditsUsed: credits,
      outcome: html ? "ok" : "error",
    });
    // Context reports no origin status.
    if (html) return { html, status: null };
  }
  throw new Error("Unable to render this page");
}

export const RenderedPageService = { renderPage } as const;
