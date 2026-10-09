import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("self-host audit worker secrets", () => {
  it("binds the credential encryption secret to the audit worker", async () => {
    // The Alchemy stack evaluates providers at import time, so this is the
    // narrowest regression guard for the deployed Worker environment.
    const stack = await readFile(
      new URL("../../deploy/alchemy/alchemy.run.ts", import.meta.url),
      "utf8",
    );
    const auditWorker = stack.slice(
      stack.indexOf('Cloudflare.Worker("open-seo-audit"'),
      stack.indexOf('const app = yield* Cloudflare.Worker("open-seo"'),
    );

    expect(auditWorker).toContain(
      "BETTER_AUTH_SECRET: dataEnv.BETTER_AUTH_SECRET",
    );
  });
});
