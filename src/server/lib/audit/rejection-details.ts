import { createHash } from "node:crypto";

/** Inspect only a bounded clone; never return response text or affect its consumer. */
export async function inspectAuditRejection(response: Response) {
  let body = "";
  let inspectedBytes = 0;
  let inspectionComplete = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    reader = response.clone().body?.getReader();
    if (reader) {
      const deadline = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("Diagnostic read budget")),
          500,
        );
      });
      const decoder = new TextDecoder();
      while (inspectedBytes < 4096) {
        const chunk = await Promise.race([reader.read(), deadline]);
        if (chunk.done) {
          inspectionComplete = true;
          break;
        }
        const bytes = chunk.value.subarray(0, 4096 - inspectedBytes);
        inspectedBytes += bytes.byteLength;
        body += decoder.decode(bytes, { stream: true });
      }
      body += decoder.decode();
    } else {
      inspectionComplete = true;
    }
  } catch {
    // The audit must retain the original response even if inspection fails.
  } finally {
    clearTimeout(timer);
    // Awaiting a tee branch cancellation can wait for the original consumer.
    if (reader) void reader.cancel().catch(() => {});
  }
  return {
    server: response.headers.get("server"),
    contentType: response.headers.get("content-type"),
    contentLength: response.headers.get("content-length"),
    cfMitigated: response.headers.get("cf-mitigated"),
    cacheControl: response.headers.get("cache-control"),
    age: response.headers.get("age"),
    inspectedBytes,
    inspectionComplete,
    bodyFingerprint: createHash("sha256")
      .update(body)
      .digest("hex")
      .slice(0, 16),
    cloudflareErrorCode:
      body.match(
        /(?:error\s*(?:code)?[:\s]*|data-translate="code_)(1\d{3})/i,
      )?.[1] ?? null,
    cloudflare: /cloudflare/i.test(body),
    shopify: /shopify/i.test(body),
    challenge: /cf-chl|challenge-platform|just a moment/i.test(body),
    localRateLimited: /local_rate_limited/i.test(body),
    rateLimit: /too many requests|rate.limit|error.*1015/i.test(body),
  };
}
