"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Layers3,
  Megaphone,
  PackageCheck,
  PlusCircle,
  RefreshCw,
  Repeat,
  Send,
} from "lucide-react";
import {
  EmptyState,
  ErrorBanner,
  GhostButton,
  LocalBadge,
  MetricCard,
  PageHeader,
  Panel,
  PrimaryButton,
  Row,
  SectionHeader,
  StatusBadge,
} from "@/components/ui";

type DistributionChannel =
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

type DistributionJobStatus = "queued" | "scheduled" | "publishing" | "published" | "failed";
type CampaignStatus = "draft" | "scheduled" | "active" | "completed" | "paused";

interface DistributionJob {
  jobId: string;
  missionId: string | null;
  campaignId: string | null;
  channel: DistributionChannel;
  title: string;
  status: DistributionJobStatus;
  attempts: number;
  lastError: string | null;
  updatedAt: string;
}

interface PublishedAsset {
  assetId: string;
  jobId: string;
  channel: DistributionChannel;
  title: string;
  url: string;
  publishedAt: string;
}

interface Campaign {
  campaignId: string;
  name: string;
  channels: DistributionChannel[];
  status: CampaignStatus;
  jobIds: string[];
  updatedAt: string;
}

interface DistributionOverview {
  totalJobs: number;
  queuedJobs: number;
  scheduledJobs: number;
  failedJobs: number;
  publishedAssets: number;
  activeCampaigns: number;
  distributionSuccessRate: number;
  channelPerformance: Record<DistributionChannel, { jobs: number; published: number; failed: number }>;
}

const CHANNELS: DistributionChannel[] = ["website", "blog", "email", "linkedin", "x_twitter", "facebook", "instagram", "tiktok", "youtube", "internal_feed"];

const STATUS_COLOR: Record<DistributionJobStatus | CampaignStatus, string> = {
  queued: "#f59e0b",
  scheduled: "#3b82f6",
  publishing: "#a78bfa",
  published: "#22c55e",
  failed: "#f43f5e",
  draft: "#94a3b8",
  active: "#22c55e",
  completed: "#6366f1",
  paused: "#f59e0b",
};

export default function DistributionPage() {
  const [overview, setOverview] = useState<DistributionOverview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [jobs, setJobs] = useState<DistributionJob[]>([]);
  const [assets, setAssets] = useState<PublishedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<DistributionChannel>("internal_feed");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/distribution/overview");
      if (res.ok) {
        const data = await res.json();
        setOverview(data.overview);
        setCampaigns(data.campaigns ?? []);
        setJobs(data.jobs ?? []);
        setAssets(data.assets ?? []);
      } else {
        setError("Failed to load distribution overview. Check that the local API is running.");
      }
    } catch {
      setError("Network error — could not reach the local API. Ensure the dev server is running.");
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const publish = async () => {
    await fetch("/api/distribution/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || undefined,
        channel,
        content: title ? `Published distribution asset: ${title}` : undefined,
      }),
    });
    setTitle("");
    loadData();
  };

  const scheduleCampaign = async () => {
    await fetch("/api/distribution/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: title || "Distribution campaign", channels: [channel, "internal_feed"] }),
    });
    setTitle("");
    loadData();
  };

  const retry = async (jobId: string) => {
    await fetch("/api/distribution/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    loadData();
  };

  const publishJob = async (jobId: string) => {
    await fetch("/api/distribution/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    loadData();
  };

  const failedJobs = jobs.filter((job) => job.status === "failed");
  const queuedJobs = jobs.filter((job) => job.status === "queued" || job.status === "scheduled" || job.status === "publishing");

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      <PageHeader
        icon={<Megaphone size={20} />}
        title="Distribution Engine"
        description="Publishing, campaigns and local channel distribution — push content to every channel from a single pane."
        badge={<LocalBadge />}
        actions={
          <GhostButton onClick={loadData} disabled={loading}>
            <RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
          </GhostButton>
        }
      />

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <AnimatePresence mode="wait">
        <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {overview && (
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))", gap: 12, marginBottom: 32 }}>
              <MetricCard label="Published Assets" value={overview.publishedAssets} icon={<PackageCheck size={15} />} color="#22c55e" />
              <MetricCard label="Active Campaigns" value={overview.activeCampaigns} icon={<Megaphone size={15} />} color="#a78bfa" />
              <MetricCard label="Queued Jobs" value={overview.queuedJobs} icon={<Layers3 size={15} />} color="#f59e0b" />
              <MetricCard label="Scheduled" value={overview.scheduledJobs} icon={<Send size={15} />} color="#3b82f6" />
              <MetricCard label="Failed Jobs" value={overview.failedJobs} icon={<AlertTriangle size={15} />} color="#f43f5e" />
              <MetricCard label="Success Rate" value={`${overview.distributionSuccessRate}%`} icon={<CheckCircle2 size={15} />} color="#34d399" />
            </section>
          )}

          <Panel>
            <SectionHeader icon={<PlusCircle size={12} />} title="Publish or Schedule" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 170px auto auto", gap: 8 }}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Asset or campaign title" style={inputStyle} />
              <select value={channel} onChange={(e) => setChannel(e.target.value as DistributionChannel)} style={inputStyle}>
                {CHANNELS.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
              </select>
              <PrimaryButton onClick={publish} color="#22c55e"><Send size={12} /> Publish</PrimaryButton>
              <PrimaryButton onClick={scheduleCampaign}><Megaphone size={12} /> Campaign</PrimaryButton>
            </div>
          </Panel>

          <Panel>
            <SectionHeader icon={<Megaphone size={12} />} title="Active Campaigns" />
            {campaigns.length === 0 ? (
              <EmptyState title="No campaigns scheduled" description="Schedule a campaign above to start distributing content across multiple channels simultaneously." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {campaigns.map((campaign) => (
                  <Row key={campaign.campaignId}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{campaign.name}</div>
                      <div style={{ fontSize: 10, color: "var(--text-3)" }}>{campaign.channels.map((item) => item.replace(/_/g, " ")).join(" · ")} · {campaign.jobIds.length} jobs</div>
                    </div>
                    <StatusBadge label={campaign.status.replace(/_/g, " ")} color={STATUS_COLOR[campaign.status]} />
                  </Row>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <SectionHeader icon={<PackageCheck size={12} />} title="Published Assets" />
            {assets.length === 0 ? (
              <EmptyState title="No assets published" description="Publish your first asset above to see it appear here with channel and URL details." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {assets.map((asset) => (
                  <Row key={asset.assetId}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{asset.title}</div>
                      <div style={{ fontSize: 10, color: "var(--text-3)" }}>{asset.channel.replace(/_/g, " ")} · {asset.url}</div>
                    </div>
                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>{new Date(asset.publishedAt).toLocaleDateString()}</span>
                  </Row>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <SectionHeader icon={<Layers3 size={12} />} title="Distribution Queue" />
            {queuedJobs.length === 0 ? (
              <EmptyState title="No queued distribution jobs" description="All jobs have been processed. New publishes will enter the queue before going live." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {queuedJobs.map((job) => (
                  <Row key={job.jobId}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{job.title}</div>
                      <div style={{ fontSize: 10, color: "var(--text-3)" }}>{job.channel.replace(/_/g, " ")} · attempts {job.attempts}</div>
                    </div>
                    <StatusBadge label={job.status.replace(/_/g, " ")} color={STATUS_COLOR[job.status]} />
                    <PrimaryButton onClick={() => publishJob(job.jobId)}>Publish</PrimaryButton>
                  </Row>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <SectionHeader icon={<AlertTriangle size={12} />} title="Failed Jobs and Retry Actions" />
            {failedJobs.length === 0 ? (
              <EmptyState title="No failed jobs" description="All distribution jobs completed successfully. Failed jobs will appear here with retry options." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {failedJobs.map((job) => (
                  <Row key={job.jobId}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{job.title}</div>
                      <div style={{ fontSize: 10, color: "var(--text-3)" }}>{job.lastError ?? "Distribution failed"}</div>
                    </div>
                    <PrimaryButton onClick={() => retry(job.jobId)} color="#f43f5e"><Repeat size={10} /> Retry</PrimaryButton>
                  </Row>
                ))}
              </div>
            )}
          </Panel>

          {overview && (
            <Panel>
              <SectionHeader icon={<BarChart3 size={12} />} title="Channel Performance" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                {CHANNELS.map((item) => {
                  const perf = overview.channelPerformance[item];
                  return (
                    <div key={item} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{item.replace(/_/g, " ")}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-3)" }}>
                        <span>{perf.jobs} jobs</span>
                        <span style={{ color: "#22c55e" }}>{perf.published} published</span>
                        <span style={{ color: "#f43f5e" }}>{perf.failed} failed</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 12,
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
  outline: "none",
};
