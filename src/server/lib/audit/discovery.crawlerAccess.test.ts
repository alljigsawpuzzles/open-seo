import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuditFetchDiagnostics } from "@/server/lib/audit/fetch-diagnostics";
import { discoverUrls } from "@/server/lib/audit/discovery";
import { shopifyCrawlerHeaders } from "@/shared/crawler-access";

const access = {
  host: "store.example.com",
  headers: shopifyCrawlerHeaders("sig1=(...)", "sig1=:abc:"),
  expiresAt: null,
};

/** The `signature` header sent on the request to `url`, or undefined. */
function signatureSentTo(url: string) {
  const call = vi.mocked(fetch).mock.calls.find((entry) => entry[0] === url);
  return call && new Headers(call[1]?.headers).get("signature");
}

describe("discoverUrls crawler access", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("records concurrent sitemap fetches in request-start order", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url.endsWith("robots.txt")) return new Response("", { status: 200 });
      if (url.endsWith("/sitemap.xml"))
        return new Response(
          "<sitemapindex><sitemap><loc>https://store.example.com/one.xml</loc></sitemap><sitemap><loc>https://store.example.com/two.xml</loc></sitemap></sitemapindex>",
          { headers: { "content-type": "application/xml" } },
        );
      return new Response(
        "<urlset><url><loc>https://store.example.com/" +
          (url.endsWith("one.xml") ? "one" : "two") +
          "</loc></url></urlset>",
        { headers: { "content-type": "application/xml" } },
      );
    });
    const result = await discoverUrls(
      "https://store.example.com",
      10,
      access,
      createAuditFetchDiagnostics("concurrent-audit"),
    );
    expect(result.urls).toEqual(
      expect.arrayContaining([
        "https://store.example.com/one",
        "https://store.example.com/two",
      ]),
    );
    for (const [index, inFlightAtStart] of [1, 1, 1, 2].entries()) {
      expect(info).toHaveBeenNthCalledWith(
        index + 1,
        "site_audit:fetch",
        expect.objectContaining({ sequence: index + 1, inFlightAtStart }),
      );
    }
  });

  it("drops the signature when robots.txt redirects to another host", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      if (input === "https://store.example.com/robots.txt") {
        return Promise.resolve(
          new Response(null, {
            status: 301,
            headers: { location: "https://cdn.other.test/robots.txt" },
          }),
        );
      }
      return Promise.resolve(new Response("", { status: 404 }));
    });

    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await discoverUrls(
      "https://store.example.com",
      10,
      access,
      createAuditFetchDiagnostics("redirect-audit"),
    );
    expect(info).toHaveBeenCalledWith(
      "site_audit:fetch",
      expect.objectContaining({
        phase: "robots",
        status: 301,
        signatureAttached: true,
        redirectHop: 0,
      }),
    );
    expect(info).toHaveBeenCalledWith(
      "site_audit:fetch",
      expect.objectContaining({
        phase: "robots",
        status: 404,
        signatureAttached: false,
        redirectHop: 1,
      }),
    );

    expect(signatureSentTo("https://store.example.com/robots.txt")).toBe(
      access.headers.Signature,
    );
    expect(signatureSentTo("https://cdn.other.test/robots.txt")).toBeNull();
  });
});
