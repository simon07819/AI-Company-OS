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
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<DistributionChannel>("internal_feed");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/distribution/overview");
      if (res.ok) {
        const data = await res.json();
        setOverview(data.overview);
        setCampaigns(data.campaigns ?? []);
        setJobs(data.jobs ?? []);
        setAssets(data.assets ?? []);
      }
    } catch { /* ignore */ }
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>
            <Megaphone size={20} style={{ display: "inline", marginRight: 8, verticalAlign: -3 }} />
            Distribution Engine
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: "4px 0 0" }}>Publishing, campaigns and local channel distribution</p>
        </div>
        <button onClick={loadData} disabled={loading} style={ghostButton}>
          <RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {overview && (
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))", gap: 12, marginBottom: 32 }}>
              {[
                { label: "Published Assets", value: overview.publishedAssets, icon: <PackageCheck size={15} />, color: "#22c55e" },
                { label: "Active Campaigns", value: overview.activeCampaigns, icon: <Megaphone size={15} />, color: "#a78bfa" },
                { label: "Queued Jobs", value: overview.queuedJobs, icon: <Layers3 size={15} />, color: "#f59e0b" },
                { label: "Scheduled", value: overview.scheduledJobs, icon: <Send size={15} />, color: "#3b82f6" },
                { label: "Failed Jobs", value: overview.failedJobs, icon: <AlertTriangle size={15} />, color: "#f43f5e" },
                { label: "Success Rate", value: `${overview.distributionSuccessRate}%`, icon: <CheckCircle2 size={15} />, color: "#34d399" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} style={metricCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ color }}>{icon}</span>
                    <span style={metricLabel}>{label}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </section>
          )}

          <section style={panelStyle}>
            <div style={sectionTitle}><PlusCircle size={12} /> Publish or Schedule</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 170px auto auto", gap: 8 }}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Asset or campaign title" style={inputStyle} />
              <select value={channel} onChange={(e) => setChannel(e.target.value as DistributionChannel)} style={inputStyle}>
                {CHANNELS.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
              </select>
              <button onClick={publish} style={primaryButton}><Send size={12} /> Publish</button>
              <button onClick={scheduleCampaign} style={purpleButton}><Megaphone size={12} /> Campaign</button>
            </div>
          </section>

          <section style={panelStyle}>
            <div style={sectionTitle}><Megaphone size={12} /> Active Campaigns</div>
            {campaigns.length === 0 ? <div style={emptyStyle}>No campaigns scheduled.</div> : (
              <div style={listStyle}>
                {campaigns.map((campaign) => (
                  <div key={campaign.campaignId} style={rowStyle}>
                    <div style={{ flex: 1 }}>
                      <div style={rowTitle}>{campaign.name}</div>
                      <div style={rowSub}>{campaign.channels.map((item) => item.replace(/_/g, " ")).join(" · ")} · {campaign.jobIds.length} jobs</div>
                    </div>
                    <StatusPill status={campaign.status} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={panelStyle}>
            <div style={sectionTitle}><PackageCheck size={12} /> Published Assets</div>
            {assets.length === 0 ? <div style={emptyStyle}>No assets published.</div> : (
              <div style={listStyle}>
                {assets.map((asset) => (
                  <div key={asset.assetId} style={rowStyle}>
                    <div style={{ flex: 1 }}>
                      <div style={rowTitle}>{asset.title}</div>
                      <div style={rowSub}>{asset.channel.replace(/_/g, " ")} · {asset.url}</div>
                    </div>
                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>{new Date(asset.publishedAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={panelStyle}>
            <div style={sectionTitle}><Layers3 size={12} /> Distribution Queue</div>
            {queuedJobs.length === 0 ? <div style={emptyStyle}>No queued distribution jobs.</div> : (
              <div style={listStyle}>
                {queuedJobs.map((job) => (
                  <div key={job.jobId} style={rowStyle}>
                    <div style={{ flex: 1 }}>
                      <div style={rowTitle}>{job.title}</div>
                      <div style={rowSub}>{job.channel.replace(/_/g, " ")} · attempts {job.attempts}</div>
                    </div>
                    <StatusPill status={job.status} />
                    <button onClick={() => publishJob(job.jobId)} style={smallPrimary}>Publish</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={panelStyle}>
            <div style={sectionTitle}><AlertTriangle size={12} /> Failed Jobs and Retry Actions</div>
            {failedJobs.length === 0 ? <div style={emptyStyle}>No failed jobs.</div> : (
              <div style={listStyle}>
                {failedJobs.map((job) => (
                  <div key={job.jobId} style={rowStyle}>
                    <div style={{ flex: 1 }}>
                      <div style={rowTitle}>{job.title}</div>
                      <div style={rowSub}>{job.lastError ?? "Distribution failed"}</div>
                    </div>
                    <button onClick={() => retry(job.jobId)} style={smallDanger}><Repeat size={10} /> Retry</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {overview && (
            <section style={panelStyle}>
              <div style={sectionTitle}><BarChart3 size={12} /> Channel Performance</div>
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
            </section>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StatusPill({ status }: { status: DistributionJobStatus | CampaignStatus }) {
  const color = STATUS_COLOR[status] ?? "#94a3b8";
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color, background: `${color}20`, padding: "3px 8px", borderRadius: "var(--radius-sm)", textTransform: "uppercase", letterSpacing: "0.3px" }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

const panelStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: "18px 22px",
  marginBottom: 32,
};

const sectionTitle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-3)",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  marginBottom: 14,
};

const metricCard: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: "14px 16px",
};

const metricLabel: React.CSSProperties = {
  fontSize: 10,
  color: "var(--text-3)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 12,
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
  outline: "none",
};

const primaryButton: React.CSSProperties = {
  fontSize: 12,
  background: "#22c55e",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  gap: 5,
};

const purpleButton: React.CSSProperties = {
  ...primaryButton,
  background: "#6366f1",
};

const ghostButton: React.CSSProperties = {
  fontSize: 11,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "6px 12px",
  cursor: "pointer",
  color: "var(--text-2)",
  display: "flex",
  alignItems: "center",
  gap: 5,
};

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  background: "var(--bg-2)",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
};

const rowTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text)",
  marginBottom: 2,
};

const rowSub: React.CSSProperties = {
  fontSize: 10,
  color: "var(--text-3)",
};

const emptyStyle: React.CSSProperties = {
  color: "var(--text-3)",
  fontSize: 13,
  padding: "8px 0",
};

const smallPrimary: React.CSSProperties = {
  fontSize: 10,
  background: "#6366f1",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "4px 8px",
  cursor: "pointer",
};

const smallDanger: React.CSSProperties = {
  ...smallPrimary,
  background: "#f43f5e",
  display: "flex",
  alignItems: "center",
  gap: 4,
};
