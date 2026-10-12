import { describe, expect, it, vi } from "vitest";
import { createCrawlThrottle } from "@/server/lib/audit/crawl-throttle";
import { crawlPage } from "./site-audit-workflow-helpers";

async function crawlWithFailedRender(status: number) {
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async () =>
      new Response(
        "<html><head><title>A page</title></head><body><h1>A page</h1></body></html>",
        {
          status,
          headers: {
            "content-type": "text/html",
            ...(status === 429 ? { "cf-mitigated": "challenge" } : {}),
          },
        },
      ),
  );
  return crawlPage(
    "https://example.com/page",
    0,
    false,
    createCrawlThrottle(Date.now() + 90_000),
    { render: vi.fn().mockRejectedValue(new Error("Unable to render")) },
  );
}

describe("optional browser rendering fallback", () => {
  it("retains readable initial HTML and flags the rendering failure", async () => {
    expect(await crawlWithFailedRender(200)).toMatchObject({
      statusCode: 200,
      fetchClass: "ok",
      title: "A page",
      renderingFailed: true,
    });
  });

  it("never analyses an initial challenge after rendering fails", async () => {
    expect(await crawlWithFailedRender(429)).toMatchObject({
      statusCode: 429,
      fetchClass: "blocked",
      title: "",
    });
  });
});
