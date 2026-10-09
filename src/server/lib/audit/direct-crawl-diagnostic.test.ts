import { afterEach, describe, expect, it, vi } from "vitest";
import {
  runAuditSequenceDiagnostic,
  runDirectCrawlDiagnostic,
} from "./direct-crawl-diagnostic";

afterEach(() => vi.unstubAllGlobals());

describe("runDirectCrawlDiagnostic", () => {
  it("makes one manual, signed crawler request and returns only safe response data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 429,
        headers: { "retry-after": "30", "cf-cache-status": "DYNAMIC" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await runDirectCrawlDiagnostic("https://store.example/", {
      host: "store.example",
      expiresAt: null,
      headers: {
        "Signature-Input": "input",
        Signature: "signature",
        "Signature-Agent": '"https://shopify.com"',
      },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://store.example/",
      expect.objectContaining({ redirect: "manual" }),
    );
    expect(result).toMatchObject({
      status: 429,
      signatureAttached: true,
      headerPresence: {
        "Signature-Input": true,
        Signature: true,
        "Signature-Agent": true,
      },
      retryAfter: "30",
      cfCacheStatus: "DYNAMIC",
    });
  });

  it("makes the discovery and homepage requests once each without retries", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runAuditSequenceDiagnostic("https://store.example/", {
      host: "store.example",
      expiresAt: null,
      headers: {
        "Signature-Input": "input",
        Signature: "signature",
        "Signature-Agent": '"https://shopify.com"',
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://store.example/robots.txt",
      "https://store.example/sitemap.xml",
      "https://store.example/",
    ]);
    expect(result).toMatchObject({
      robots: { status: 200, signatureAttached: true },
      sitemap: { status: 200, signatureAttached: true },
      homepage: { status: 429, signatureAttached: true },
    });
  });
});
