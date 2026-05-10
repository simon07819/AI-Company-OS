import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let distributionData: Record<string, unknown> = { jobs: [], assets: [], campaigns: [] };
let sessions: Array<{ sessionId: string; missionType: string; projectName: string; projectIdea: string }> = [];
const enqueueTask = vi.fn();
const emitEvent = vi.fn();

vi.mock("fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn((p: string) => p.includes("distribution-engine.json")),
    readFileSync: vi.fn((p: string) => {
      if (p.includes("distribution-engine.json")) return JSON.stringify(distributionData);
      return "{}";
    }),
    writeFileSync: vi.fn((p: string, data: string) => {
      if (p.includes("distribution-engine.json")) {
        try { distributionData = JSON.parse(data); } catch { /* ignore */ }
      }
    }),
  },
}));

vi.mock("@/lib/autopilotStore", () => ({
  listSessions: vi.fn(() => sessions),
}));

vi.mock("@/lib/runtimeQueue", () => ({
  enqueueTask,
}));

vi.mock("@/lib/runtimeEvents", () => ({
  emitEvent,
}));

describe("distributionEngine", () => {
  beforeEach(() => {
    distributionData = { jobs: [], assets: [], campaigns: [] };
    sessions = [];
    enqueueTask.mockClear();
    emitEvent.mockClear();
  });

  afterEach(() => {
    distributionData = { jobs: [], assets: [], campaigns: [] };
    sessions = [];
  });

  it("createDistributionJob creates a runtime-queued distribution job", async () => {
    const { createDistributionJob, listDistributionJobs } = await import("@/lib/distributionEngine");

    const job = createDistributionJob({ channel: "linkedin", title: "Launch post", content: "Ship it" });

    expect(job.jobId).toMatch(/^dist-/);
    expect(job.status).toBe("queued");
    expect(job.channel).toBe("linkedin");
    expect(listDistributionJobs()).toHaveLength(1);
    expect(enqueueTask).toHaveBeenCalledWith(expect.objectContaining({ agentId: "distribution_agent", taskId: `distribution:${job.jobId}` }));
  });

  it("publishAsset publishes and records an asset", async () => {
    const { createDistributionJob, publishAsset, listPublishedAssets } = await import("@/lib/distributionEngine");

    const job = createDistributionJob({ channel: "website", title: "Homepage copy", content: "Welcome" });
    const asset = publishAsset({ jobId: job.jobId });

    expect(asset).not.toBeNull();
    expect(asset!.assetId).toMatch(/^asset-/);
    expect(asset!.url).toContain("local://website/");
    expect(listPublishedAssets()).toHaveLength(1);
    expect(emitEvent).toHaveBeenCalledWith("task.completed", expect.objectContaining({ action: "distribution_published" }), expect.any(Object));
  });

  it("scheduleCampaign creates mission-specific social campaign jobs", async () => {
    sessions = [{ sessionId: "ap-social", missionType: "social_campaign", projectName: "BrandPush", projectIdea: "A launch campaign" }];
    const { scheduleCampaign, listDistributionJobs } = await import("@/lib/distributionEngine");

    const campaign = scheduleCampaign({ missionId: "ap-social" });

    expect(campaign.campaignId).toMatch(/^camp-/);
    expect(campaign.channels).toContain("linkedin");
    expect(campaign.jobIds.length).toBeGreaterThan(1);
    expect(listDistributionJobs().length).toBe(campaign.jobIds.length);
  });

  it("retryDistribution requeues failed jobs", async () => {
    const { createDistributionJob, retryDistribution } = await import("@/lib/distributionEngine");

    const job = createDistributionJob({ channel: "email", title: "Retry me" });
    const data = distributionData as { jobs: Array<Record<string, unknown>>; assets: unknown[]; campaigns: unknown[] };
    data.jobs[0] = { ...data.jobs[0], status: "failed", lastError: "Channel timeout" };

    const retried = retryDistribution(job.jobId);

    expect(retried?.status).toBe("queued");
    expect(retried?.attempts).toBe(1);
    expect(enqueueTask).toHaveBeenCalledTimes(2);
  });

  it("getDistributionOverview calculates stats", async () => {
    const { createDistributionJob, getDistributionOverview, publishAsset } = await import("@/lib/distributionEngine");

    const published = createDistributionJob({ channel: "blog", title: "Published" });
    createDistributionJob({ channel: "email", title: "Queued" });
    publishAsset({ jobId: published.jobId });

    const data = distributionData as { jobs: Array<Record<string, unknown>>; assets: unknown[]; campaigns: unknown[] };
    data.jobs.push({ ...data.jobs[0], jobId: "dist-failed", channel: "email", status: "failed", updatedAt: new Date().toISOString() });

    const overview = getDistributionOverview();
    expect(overview.totalJobs).toBe(3);
    expect(overview.publishedAssets).toBe(1);
    expect(overview.failedJobs).toBe(1);
    expect(overview.distributionSuccessRate).toBe(50);
    expect(overview.channelPerformance.email.failed).toBe(1);
  });

  it("distribution API works", async () => {
    const publishRoute = await import("@/app/api/distribution/publish/route");
    const scheduleRoute = await import("@/app/api/distribution/schedule/route");
    const retryRoute = await import("@/app/api/distribution/retry/route");
    const jobsRoute = await import("@/app/api/distribution/jobs/route");
    const overviewRoute = await import("@/app/api/distribution/overview/route");

    const publishResponse = await publishRoute.POST(new Request("http://test.local/api/distribution/publish", {
      method: "POST",
      body: JSON.stringify({ channel: "internal_feed", title: "API asset", content: "API content" }),
    }) as never);
    const publishPayload = await publishResponse.json();
    expect(publishPayload.ok).toBe(true);

    const scheduleResponse = await scheduleRoute.POST(new Request("http://test.local/api/distribution/schedule", {
      method: "POST",
      body: JSON.stringify({ name: "API campaign", channels: ["email", "linkedin"] }),
    }) as never);
    expect((await scheduleResponse.json()).campaign.jobIds).toHaveLength(2);

    const jobsPayload = await (await jobsRoute.GET()).json();
    const failedJob = jobsPayload.jobs.find((job: { status: string }) => job.status === "queued");
    const data = distributionData as { jobs: Array<Record<string, unknown>>; assets: unknown[]; campaigns: unknown[] };
    const idx = data.jobs.findIndex((job) => job.jobId === failedJob.jobId);
    data.jobs[idx] = { ...data.jobs[idx], status: "failed", lastError: "API retry test" };

    const retryResponse = await retryRoute.POST(new Request("http://test.local/api/distribution/retry", {
      method: "POST",
      body: JSON.stringify({ jobId: failedJob.jobId }),
    }) as never);
    expect((await retryResponse.json()).job.status).toBe("queued");

    const overviewPayload = await (await overviewRoute.GET()).json();
    expect(overviewPayload.ok).toBe(true);
    expect(overviewPayload.overview.publishedAssets).toBe(1);
  });
});
