import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { compareWorkflowFetch } from "./workflow-fetch-comparison";
import { shopifyCrawlerHeaders } from "@/shared/crawler-access";

const access = {
  host: "store.example.com",
  headers: shopifyCrawlerHeaders("private-input", "private-signature"),
  expiresAt: null,
};
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

it("compares a 429 with one cache-bypassing request without returning body or credentials", async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(
      new Response("error code: 1015 cloudflare private-signature", {
        status: 429,
        headers: { "cf-ray": "ray", server: "cloudflare" },
      }),
    )
    .mockResolvedValueOnce(new Response("User-agent: *", { status: 200 }));
  const result = await compareWorkflowFetch(
    "https://store.example.com/",
    access,
  );
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(vi.mocked(fetch).mock.calls[0]?.[1]?.cache).toBeUndefined();
  expect(vi.mocked(fetch).mock.calls[1]?.[1]?.cache).toBe("no-store");
  expect(result.normal).toMatchObject({
    httpStatus: 429,
    rejection: { cloudflareErrorCode: "1015", cloudflare: true },
  });
  expect(result.noStore?.httpStatus).toBe(200);
  expect(JSON.stringify(result)).not.toContain("private-signature");
  expect(JSON.stringify(result)).not.toContain("private-input");
});
it("makes only one request when the normal fetch is readable", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response("", { status: 200 }));
  const result = await compareWorkflowFetch(
    "https://store.example.com/",
    access,
  );
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(result.noStore).toBeNull();
});
it("does not send credentials to another host", async () => {
  await expect(
    compareWorkflowFetch("https://other.example.com/", access),
  ).rejects.toThrow("matching signed access");
  expect(fetch).not.toHaveBeenCalled();
});
