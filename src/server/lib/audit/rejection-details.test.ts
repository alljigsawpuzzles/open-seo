import { expect, it } from "vitest";
import { inspectAuditRejection } from "./rejection-details";

it("classifies a rejection without returning its body and leaves the original readable", async () => {
  const body =
    "error code: 1015 cloudflare local_rate_limited private-signature";
  const response = new Response(body, {
    status: 429,
    headers: { "content-type": "text/plain", server: "cloudflare" },
  });
  const result = await inspectAuditRejection(response);
  expect(result).toMatchObject({
    cloudflareErrorCode: "1015",
    cloudflare: true,
    localRateLimited: true,
    inspectionComplete: true,
    contentType: "text/plain",
  });
  expect(JSON.stringify(result)).not.toContain("private-signature");
  expect(await response.text()).toBe(body);
});

it("caps a large rejection without waiting for the original consumer", async () => {
  const response = new Response("x".repeat(16384), { status: 429 });
  const result = await inspectAuditRejection(response);
  expect(result.inspectedBytes).toBe(4096);
  expect(result.inspectionComplete).toBe(false);
  expect((await response.text()).length).toBe(16384);
});

it("bounds a stalled response inspection and keeps the original response intact", async () => {
  const response = new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("partial"));
      },
    }),
    { status: 429 },
  );
  const result = await inspectAuditRejection(response);
  expect(result.inspectedBytes).toBe(7);
  expect(result.inspectionComplete).toBe(false);
  expect(response.bodyUsed).toBe(false);
  void response.body?.cancel();
});
