import fs from "fs";
import path from "path";
import { listSessions } from "./autopilotStore";
import { enqueueTask } from "./runtimeQueue";
import { emitEvent } from "./runtimeEvents";

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const DISTRIBUTION_PATH = path.join(DATA_DIR, "distribution-engine.json");

export type DistributionChannel =
  | "website"
  | "blog"
  | "email"
  | "linkedin"
  | "x_twitter"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "internal_feed";

export type DistributionJobStatus = "queued" | "scheduled" | "publishing" | "published" | "failed";
export type CampaignStatus = "draft" | "scheduled" | "active" | "completed" | "paused";

export interface DistributionJob {
  jobId: string;
  missionId: string | null;
  campaignId: string | null;
  channel: DistributionChannel;
  title: string;
  content: string;
  status: DistributionJobStatus;
  attempts: number;
  scheduledAt: string | null;
  publishedAssetId: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublishedAsset {
  assetId: string;
  jobId: string;
  missionId: string | null;
  campaignId: string | null;
  channel: DistributionChannel;
  title: string;
  content: string;
  url: string;
  publishedAt: string;
}

export interface Campaign {
  campaignId: string;
  missionId: string | null;
  name: string;
  channels: DistributionChannel[];
  status: CampaignStatus;
  scheduledAt: string | null;
  jobIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DistributionOverview {
  totalJobs: number;
  queuedJobs: number;
  scheduledJobs: number;
  failedJobs: number;
  publishedAssets: number;
  activeCampaigns: number;
  distributionSuccessRate: number;
  channelPerformance: Record<DistributionChannel, { jobs: number; published: number; failed: number }>;
  recentAssets: PublishedAsset[];
  retryableJobs: DistributionJob[];
}

interface DistributionData {
  jobs: DistributionJob[];
  assets: PublishedAsset[];
  campaigns: Campaign[];
}

export interface CreateDistributionJobInput {
  missionId?: string | null;
  campaignId?: string | null;
  channel?: DistributionChannel;
  title?: string;
  content?: string;
  scheduledAt?: string | null;
}

export interface PublishAssetInput extends CreateDistributionJobInput {
  jobId?: string;
}

export interface ScheduleCampaignInput {
  missionId?: string | null;
  name?: string;
  channels?: DistributionChannel[];
  scheduledAt?: string | null;
}

const CHANNELS: DistributionChannel[] = [
  "website",
  "blog",
  "email",
  "linkedin",
  "x_twitter",
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "internal_feed",
];

let idCounter = Date.now();
function nextId(prefix: string): string {
  return `${prefix}-${(idCounter++).toString(36)}`;
}

function emptyData(): DistributionData {
  return { jobs: [], assets: [], campaigns: [] };
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readDistribution(): DistributionData {
  ensureDataDir();
  if (!fs.existsSync(DISTRIBUTION_PATH)) return emptyData();
  try {
    const raw = fs.readFileSync(DISTRIBUTION_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<DistributionData>;
    return {
      jobs: parsed.jobs ?? [],
      assets: parsed.assets ?? [],
      campaigns: parsed.campaigns ?? [],
    };
  } catch {
    return emptyData();
  }
}

function writeDistribution(data: DistributionData) {
  ensureDataDir();
  fs.writeFileSync(DISTRIBUTION_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "asset";
}

function inferMissionContent(missionId?: string | null): { missionType: string; title: string; content: string; channels: DistributionChannel[] } | null {
  if (!missionId) return null;
  const session = listSessions().find((item) => item.sessionId === missionId);
  if (!session) return null;
  const name = session.projectName.replace(/-/g, " ");
  if (session.missionType === "social_campaign") {
    return {
      missionType: "social_campaign",
      title: `${name} social campaign`,
      content: `Campaign launch for ${name}: ${session.projectIdea}`,
      channels: ["linkedin", "x_twitter", "facebook", "instagram", "internal_feed"],
    };
  }
  if (session.missionType === "website") {
    return {
      missionType: "website",
      title: `${name} homepage copy`,
      content: `Homepage copy for ${name}: ${session.projectIdea}`,
      channels: ["website", "blog", "internal_feed"],
    };
  }
  if (session.missionType === "saas_project") {
    return {
      missionType: "saas_project",
      title: `${name} launch summary`,
      content: `Launch summary for ${name}: ${session.projectIdea}`,
      channels: ["blog", "email", "linkedin", "internal_feed"],
    };
  }
  return {
    missionType: session.missionType,
    title: `${name} distribution asset`,
    content: `Distribution asset for ${name}: ${session.projectIdea}`,
    channels: ["internal_feed"],
  };
}

function enqueueDistributionRuntimeTask(job: DistributionJob) {
  enqueueTask({
    sessionId: job.missionId ?? "distribution",
    taskId: `distribution:${job.jobId}`,
    agentId: "distribution_agent",
    phase: "distribution",
    priority: job.channel === "internal_feed" ? 1 : 3,
    dependencies: [],
  });
}

function buildAssetUrl(asset: Pick<PublishedAsset, "channel" | "title" | "assetId">): string {
  return `local://${asset.channel}/${slugify(asset.title)}-${asset.assetId}`;
}

export function createDistributionJob(input: CreateDistributionJobInput): DistributionJob {
  const inferred = inferMissionContent(input.missionId);
  const now = new Date().toISOString();
  const job: DistributionJob = {
    jobId: nextId("dist"),
    missionId: input.missionId ?? null,
    campaignId: input.campaignId ?? null,
    channel: input.channel ?? inferred?.channels[0] ?? "internal_feed",
    title: input.title ?? inferred?.title ?? "Distribution asset",
    content: input.content ?? inferred?.content ?? "Local distribution content",
    status: input.scheduledAt ? "scheduled" : "queued",
    attempts: 0,
    scheduledAt: input.scheduledAt ?? null,
    publishedAssetId: null,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };

  const data = readDistribution();
  data.jobs.push(job);
  writeDistribution(data);
  enqueueDistributionRuntimeTask(job);
  emitEvent("queue.updated", { action: "distribution_enqueued", jobId: job.jobId, channel: job.channel }, { sessionId: job.missionId ?? undefined, taskId: job.jobId });
  return job;
}

export function listDistributionJobs(): DistributionJob[] {
  return readDistribution().jobs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function listPublishedAssets(): PublishedAsset[] {
  return readDistribution().assets.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function listCampaigns(): Campaign[] {
  return readDistribution().campaigns.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function publishAsset(input: PublishAssetInput): PublishedAsset | null {
  let data = readDistribution();
  let job = input.jobId ? data.jobs.find((item) => item.jobId === input.jobId) : null;
  if (!job) {
    job = createDistributionJob(input);
    data = readDistribution();
  }

  const idx = data.jobs.findIndex((item) => item.jobId === job!.jobId);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  const assetId = nextId("asset");
  const asset: PublishedAsset = {
    assetId,
    jobId: data.jobs[idx].jobId,
    missionId: data.jobs[idx].missionId,
    campaignId: data.jobs[idx].campaignId,
    channel: data.jobs[idx].channel,
    title: data.jobs[idx].title,
    content: data.jobs[idx].content,
    url: buildAssetUrl({ assetId, channel: data.jobs[idx].channel, title: data.jobs[idx].title }),
    publishedAt: now,
  };

  data.jobs[idx] = {
    ...data.jobs[idx],
    status: "published",
    attempts: data.jobs[idx].attempts + 1,
    publishedAssetId: asset.assetId,
    lastError: null,
    updatedAt: now,
  };
  data.assets.push(asset);
  writeDistribution(data);
  emitEvent("task.completed", { action: "distribution_published", jobId: data.jobs[idx].jobId, channel: asset.channel, url: asset.url }, { sessionId: asset.missionId ?? undefined, taskId: data.jobs[idx].jobId });
  return asset;
}

export function scheduleCampaign(input: ScheduleCampaignInput): Campaign {
  const inferred = inferMissionContent(input.missionId);
  const channels = input.channels?.length ? input.channels : inferred?.channels ?? ["internal_feed"];
  const now = new Date().toISOString();
  const campaign: Campaign = {
    campaignId: nextId("camp"),
    missionId: input.missionId ?? null,
    name: input.name ?? inferred?.title ?? "Distribution campaign",
    channels,
    status: input.scheduledAt ? "scheduled" : "active",
    scheduledAt: input.scheduledAt ?? null,
    jobIds: [],
    createdAt: now,
    updatedAt: now,
  };

  const data = readDistribution();
  data.campaigns.push(campaign);
  writeDistribution(data);

  const jobs = channels.map((channel) => createDistributionJob({
    missionId: campaign.missionId,
    campaignId: campaign.campaignId,
    channel,
    title: `${campaign.name} - ${channel.replace(/_/g, " ")}`,
    content: inferred?.content ?? `Campaign content for ${campaign.name}`,
    scheduledAt: campaign.scheduledAt,
  }));

  const refreshed = readDistribution();
  const idx = refreshed.campaigns.findIndex((item) => item.campaignId === campaign.campaignId);
  if (idx !== -1) {
    refreshed.campaigns[idx] = { ...refreshed.campaigns[idx], jobIds: jobs.map((job) => job.jobId), updatedAt: new Date().toISOString() };
    writeDistribution(refreshed);
    return refreshed.campaigns[idx];
  }

  return { ...campaign, jobIds: jobs.map((job) => job.jobId) };
}

export function retryDistribution(jobId: string): DistributionJob | null {
  const data = readDistribution();
  const idx = data.jobs.findIndex((job) => job.jobId === jobId);
  if (idx === -1) return null;
  if (data.jobs[idx].status !== "failed") return data.jobs[idx];
  const now = new Date().toISOString();
  data.jobs[idx] = {
    ...data.jobs[idx],
    status: "queued",
    attempts: data.jobs[idx].attempts + 1,
    lastError: null,
    updatedAt: now,
  };
  writeDistribution(data);
  enqueueDistributionRuntimeTask(data.jobs[idx]);
  emitEvent("queue.updated", { action: "distribution_retry", jobId }, { sessionId: data.jobs[idx].missionId ?? undefined, taskId: jobId });
  return data.jobs[idx];
}

export function getDistributionOverview(): DistributionOverview {
  const data = readDistribution();
  const channelPerformance = CHANNELS.reduce((acc, channel) => {
    acc[channel] = { jobs: 0, published: 0, failed: 0 };
    return acc;
  }, {} as DistributionOverview["channelPerformance"]);

  for (const job of data.jobs) {
    channelPerformance[job.channel].jobs++;
    if (job.status === "published") channelPerformance[job.channel].published++;
    if (job.status === "failed") channelPerformance[job.channel].failed++;
  }

  const completed = data.jobs.filter((job) => job.status === "published" || job.status === "failed");
  const published = data.jobs.filter((job) => job.status === "published");

  return {
    totalJobs: data.jobs.length,
    queuedJobs: data.jobs.filter((job) => job.status === "queued" || job.status === "publishing").length,
    scheduledJobs: data.jobs.filter((job) => job.status === "scheduled").length,
    failedJobs: data.jobs.filter((job) => job.status === "failed").length,
    publishedAssets: data.assets.length,
    activeCampaigns: data.campaigns.filter((campaign) => campaign.status === "active" || campaign.status === "scheduled").length,
    distributionSuccessRate: completed.length === 0 ? 0 : Math.round((published.length / completed.length) * 100),
    channelPerformance,
    recentAssets: data.assets
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 8),
    retryableJobs: data.jobs
      .filter((job) => job.status === "failed")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8),
  };
}
