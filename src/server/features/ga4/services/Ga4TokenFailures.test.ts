import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleTokenError } from "@/server/lib/googleTokenErrors";
import { Ga4TokenError } from "@/server/lib/ga4Errors";
import { makeGa4Connection } from "./ga4-test-fixtures";
import { Ga4ReportingService } from "./Ga4ReportingService";

const mocks = vi.hoisted(() => ({
  getByProjectId: vi.fn(),
  runReport: vi.fn(),
}));
vi.mock("@/server/features/ga4/repositories/Ga4ConnectionRepository", () => ({
  Ga4ConnectionRepository: { getByProjectId: mocks.getByProjectId },
}));
vi.mock("@/server/lib/ga4Client", () => ({
  createGa4DataClient: () => ({ runReport: mocks.runReport }),
}));

describe("GA4 token failure reporting", () => {
  beforeEach(() => {
    mocks.getByProjectId.mockResolvedValue(makeGa4Connection());
  });
  it.each([
    [new GoogleTokenError("invalid_grant", 400), "ga4_reconnect_required"],
    [
      new GoogleTokenError("temporarily_unavailable", 503),
      "ga4_upstream_unavailable",
    ],
    [new GoogleTokenError("invalid_client", 401), "ga4_upstream_unavailable"],
    [new TypeError("network unavailable"), "ga4_upstream_unavailable"],
  ])("distinguishes token failure %s", async (cause, code) => {
    mocks.runReport.mockRejectedValueOnce(new Ga4TokenError("failed", cause));
    await expect(
      Ga4ReportingService.runReport({
        projectId: "project_1",
        kind: "landing_pages",
      }),
    ).rejects.toMatchObject({ code });
  });
});
