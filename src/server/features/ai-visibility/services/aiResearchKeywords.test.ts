import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  listCompetitors,
  listResearchKeywords,
  research,
  workflow,
  prepareWebsiteTracking,
  startWebsiteTrackingRun,
  getOptionalEnvValue,
  isHostedServerAuthMode,
  checkUsageCreditsDepleted,
} = vi.hoisted(() => ({
  listCompetitors: vi.fn(),
  listResearchKeywords: vi.fn(),
  research: vi.fn(),
  workflow: { get: vi.fn(), create: vi.fn() },
  prepareWebsiteTracking: vi.fn(),
  startWebsiteTrackingRun: vi.fn(),
  getOptionalEnvValue: vi.fn(),
  isHostedServerAuthMode: vi.fn(),
  checkUsageCreditsDepleted: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({
  env: { AI_VISIBILITY_WORKFLOW: workflow },
}));

vi.mock("@/db/runBatch", () => ({ runBatch: vi.fn() }));
vi.mock("@/server/billing/subscription", () => ({
  checkUsageCreditsDepleted,
}));
vi.mock("@/server/lib/runtime-env", () => ({
  getOptionalEnvValue,
  isHostedServerAuthMode,
}));
vi.mock("../repositories/aiVisibilityConfigurationRepository", () => ({
  writeConfiguration: vi.fn(),
  writeResearchKeywords: vi.fn(),
}));
vi.mock("./websiteTrackingSetup", () => ({
  prepareWebsiteTracking,
  startWebsiteTrackingRun,
}));
vi.mock("@/server/features/projects/repositories/ProjectRepository", () => ({
  ProjectRepository: {
    getProjectForOrganization: async () => ({
      id: "project",
      name: "OpenSEO",
      domain: "openseo.so",
      locationCode: 2840,
      languageCode: "en",
    }),
  },
}));
vi.mock(
  "@/server/features/project-context/repositories/ProjectContextRepository",
  () => ({
    ProjectContextRepository: {
      listSections: async () => [
        { key: "business_overview", content: "SEO tools." },
      ],
      listCompetitors,
    },
  }),
);
vi.mock("../repositories/AiVisibilityRepository", () => ({
  AiVisibilityRepository: { listResearchKeywords },
}));
vi.mock("@/server/features/projects/services/websiteResearch", () => ({
  researchWebsite: research,
}));

import {
  getAiResearchSetup,
  runAiResearchSetup,
  startAiResearchSetup,
} from "./aiResearchKeywords";
import { customer } from "./aiVisibilityTestFixtures";

const topic = (name: string) => ({ name, prompts: [] });

beforeEach(() => {
  getOptionalEnvValue.mockResolvedValue("test-model-key");
  isHostedServerAuthMode.mockResolvedValue(false);
  checkUsageCreditsDepleted.mockResolvedValue({ depleted: false });
});

describe("runAiResearchSetup", () => {
  beforeEach(() => {
    listResearchKeywords.mockResolvedValue([]);
    listCompetitors.mockResolvedValue([]);
    prepareWebsiteTracking.mockResolvedValue(null);
    research.mockResolvedValue({
      name: "OpenSEO",
      domain: "openseo.so",
      overview: "SEO tools.",
      competitors: [
        {
          name: "Ahrefs",
          domain: "ahrefs.com",
          notes: "SEO suite.",
          sourceUrl: "https://ahrefs.com/",
        },
      ],
      suggestedTopics: ["rank tracker", "seo tool"].map(topic),
      suggestedKeywords: [],
    });
  });

  it("does nothing when keywords were saved meanwhile", async () => {
    listResearchKeywords.mockResolvedValue(["rank tracker"]);

    await expect(
      runAiResearchSetup({ projectId: "project" }, customer),
    ).resolves.toEqual({ review: null });
    expect(research).not.toHaveBeenCalled();
  });

  it("runs newly seeded tracking once only for in-app setup", async () => {
    listCompetitors.mockResolvedValue([{ domain: "ahrefs.com" }]);
    prepareWebsiteTracking.mockResolvedValue({ prompts: [] });

    await runAiResearchSetup({ projectId: "project" }, customer);
    expect(startWebsiteTrackingRun).not.toHaveBeenCalled();

    await runAiResearchSetup({ projectId: "project" }, customer, {
      runSeededTracking: true,
    });
    expect(startWebsiteTrackingRun).toHaveBeenCalledWith("project", customer);
  });

  it("returns website research for competitor review when competitors are missing", async () => {
    const result = await runAiResearchSetup({ projectId: "project" }, customer);

    expect(result).toMatchObject({
      review: { competitors: [{ domain: "ahrefs.com" }] },
    });
  });
});

describe("getAiResearchSetup", () => {
  it.each([
    [
      "AppError: We couldn't read this website. Check the URL and try again.",
      "website_unreadable",
    ],
    ["Error: connect ECONNREFUSED 10.0.0.5:5432", null],
  ])("surfaces only a known failure cause for %s", async (message, failure) => {
    listResearchKeywords.mockResolvedValue([]);
    listCompetitors.mockResolvedValue([]);
    workflow.get.mockResolvedValue({
      status: async () => ({
        status: "errored",
        error: { name: "Error", message },
      }),
    });

    const setup = await getAiResearchSetup("project");

    expect(setup).toMatchObject({ status: "failed", failure });
    expect(JSON.stringify(setup)).not.toContain(message);
  });
});

describe("startAiResearchSetup", () => {
  it("does not start a second paid run while one is running, such as after a reload", async () => {
    listResearchKeywords.mockResolvedValue([]);
    listCompetitors.mockResolvedValue([]);
    workflow.get.mockResolvedValue({
      status: async () => ({ status: "running" }),
      restart: vi.fn(),
    });

    await expect(
      startAiResearchSetup({ projectId: "project" }, customer),
    ).resolves.toMatchObject({ status: "running" });
    expect(workflow.create).not.toHaveBeenCalled();
  });

  it("starts one workflow per project with serializable billing fields only", async () => {
    listResearchKeywords.mockResolvedValue([]);
    listCompetitors.mockResolvedValue([]);
    workflow.get.mockRejectedValue(new Error("not found"));

    await startAiResearchSetup(
      { projectId: "project" },
      // A request context also carries objects a workflow cannot serialize.
      { ...customer, project: { id: "project" } } as typeof customer,
    );

    expect(workflow.create).toHaveBeenCalledWith({
      id: "ai-research-setup-project",
      params: {
        setupProjectId: "project",
        runSeededTracking: false,
        customer: { ...customer, projectId: "project" },
      },
    });
  });
});

describe("manual self-hosted AI visibility", () => {
  beforeEach(() => {
    getOptionalEnvValue.mockResolvedValue(undefined);
    listResearchKeywords.mockResolvedValue([]);
    listCompetitors.mockResolvedValue([]);
  });

  it("lets a self-host without a generation model use manual setup despite an old failed workflow", async () => {
    workflow.get.mockResolvedValue({
      status: async () => ({ status: "errored" }),
    });

    await expect(getAiResearchSetup("project")).resolves.toMatchObject({
      status: "manual",
      generationAvailable: false,
      keywords: [],
    });
    expect(workflow.get).not.toHaveBeenCalled();
  });

  it("does not start a paid setup workflow for a manual self-host", async () => {
    await expect(
      startAiResearchSetup({ projectId: "project" }, customer),
    ).resolves.toMatchObject({ status: "manual" });
    expect(workflow.create).not.toHaveBeenCalled();
    expect(research).not.toHaveBeenCalled();
  });

  it("keeps the hosted setup credit check when its generation key is missing", async () => {
    isHostedServerAuthMode.mockResolvedValue(true);
    checkUsageCreditsDepleted.mockResolvedValue({ depleted: true });
    workflow.get.mockResolvedValue({
      status: async () => ({ status: "errored" }),
    });

    await expect(
      startAiResearchSetup({ projectId: "project" }, customer),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_CREDITS" });
    expect(workflow.create).not.toHaveBeenCalled();
  });
});
