import { describe, expect, it } from "vitest";
import { bypassOpenRouterKeyGate } from "./openRouterKeyGateAccess";

describe("bypassOpenRouterKeyGate", () => {
  it("always allows hosted deployments", () => {
    expect(
      bypassOpenRouterKeyGate({
        hosted: true,
        openRouterConfigured: false,
        generationAvailable: true,
      }),
    ).toBe(true);
  });

  it("allows self-hosts once OpenRouter is configured", () => {
    expect(
      bypassOpenRouterKeyGate({
        hosted: false,
        openRouterConfigured: true,
        generationAvailable: true,
      }),
    ).toBe(true);
  });

  it("allows DataForSEO-only self-hosts without an OpenRouter key", () => {
    expect(
      bypassOpenRouterKeyGate({
        hosted: false,
        openRouterConfigured: false,
        generationAvailable: false,
      }),
    ).toBe(true);
  });

  it("blocks self-hosts that expect generation until a key is set", () => {
    expect(
      bypassOpenRouterKeyGate({
        hosted: false,
        openRouterConfigured: false,
        generationAvailable: true,
      }),
    ).toBe(false);
  });

  it("waits for setup status before bypassing", () => {
    expect(
      bypassOpenRouterKeyGate({
        hosted: false,
        openRouterConfigured: false,
        generationAvailable: undefined,
      }),
    ).toBe(false);
  });
});
