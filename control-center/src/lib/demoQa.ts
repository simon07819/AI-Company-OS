import { getOnboardingOverview } from "./onboarding";
import { getBusinessOverview } from "./businessOps";
import { getCrmOverview } from "./clientCrm";
import { getRevenueOverview } from "./revenueSystem";
import { getDistributionOverview } from "./distributionEngine";
import { getExecutiveCommandOverview } from "./executiveCommand";
import { getAllAgentStates } from "./agentRuntime";
import { listSessions } from "./autopilotStore";
import { loadDeliveryPackage } from "./deliveryPackage";
import { loadReviewReport } from "./deliverableReview";
import { getWorkspaceOverview } from "./companyWorkspace";

// ─── Types ────────────────────────────────────────────────────────────────

export interface QaCheck {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  href: string;
}

export interface QaResult {
  score: number;           // 0-100
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  checks: QaCheck[];
  runAt: string;
  recommendations: string[];
}

// ─── Check Helpers ─────────────────────────────────────────────────────────

function pass(id: string, label: string, detail: string, href: string): QaCheck {
  return { id, label, status: "pass", detail, href };
}
function fail(id: string, label: string, detail: string, href: string): QaCheck {
  return { id, label, status: "fail", detail, href };
}
function warn(id: string, label: string, detail: string, href: string): QaCheck {
  return { id, label, status: "warn", detail, href };
}

// ─── Run All QA Checks ─────────────────────────────────────────────────────

export function runDemoQa(): QaResult {
  const checks: QaCheck[] = [];
  const recommendations: string[] = [];

  // 1. Onboarding state
  try {
    const onb = getOnboardingOverview();
    const companyName = onb.state?.preferences?.companyName;
    if (companyName && companyName.length > 0) {
      checks.push(pass("onboarding", "Onboarding Setup", `Company "${companyName}" configured`, "/onboarding"));
    } else {
      checks.push(fail("onboarding", "Onboarding Setup", "No company name set", "/onboarding"));
      recommendations.push("Complete onboarding at /onboarding to set up company identity.");
    }
  } catch {
    checks.push(fail("onboarding", "Onboarding Setup", "Could not read onboarding state", "/onboarding"));
  }

  // 2. Default workspace
  try {
    const ws = getWorkspaceOverview();
    if (ws && (ws as { totalWorkspaces?: number }).totalWorkspaces !== undefined) {
      const tw = (ws as { totalWorkspaces?: number }).totalWorkspaces ?? 0;
      checks.push(pass("workspace", "Default Workspace", `${tw} workspace(s) configured`, "/workspaces"));
    } else {
      checks.push(fail("workspace", "Default Workspace", "No workspace found", "/workspaces"));
      recommendations.push("Create a workspace at /workspaces to organize missions.");
    }
  } catch {
    checks.push(warn("workspace", "Default Workspace", "Could not verify workspace state", "/workspaces"));
  }

  // 3. Demo seed (check if data exists across stores)
  try {
    const biz = getBusinessOverview();
    const crm = getCrmOverview();
    const seeded = biz.totalMissions > 0 || crm.totalLeads > 0 || crm.totalClients > 0;
    if (seeded) {
      checks.push(pass("demo_seed", "Demo Data Seeded", `${biz.totalMissions} mission(s), ${crm.totalLeads} lead(s), ${crm.totalClients} client(s)`, "/demo"));
    } else {
      checks.push(fail("demo_seed", "Demo Data Seeded", "No demo data found — seed from Demo Center", "/demo"));
      recommendations.push("Seed demo data at /demo to populate the full system.");
    }
  } catch {
    checks.push(warn("demo_seed", "Demo Data Seeded", "Could not verify seed state", "/demo"));
  }

  // 4. Command overview
  try {
    const cmd = getExecutiveCommandOverview();
    checks.push(pass("command", "Command Center", `Health: ${cmd.healthGrade}, ${cmd.alerts?.length ?? 0} alert(s)`, "/command"));
  } catch {
    checks.push(warn("command", "Command Center", "Could not read command center state", "/command"));
  }

  // 5. Business overview
  try {
    const biz = getBusinessOverview();
    if (biz.totalMissions > 0) {
      checks.push(pass("business", "Business Overview", `${biz.totalMissions} mission(s), $${biz.estimatedRevenuePotential.toLocaleString()} revenue potential`, "/business"));
    } else {
      checks.push(fail("business", "Business Overview", "No missions in pipeline", "/business"));
      recommendations.push("Launch a mission at /projects/new to populate the business pipeline.");
    }
  } catch {
    checks.push(warn("business", "Business Overview", "Could not read business state", "/business"));
  }

  // 6. CRM overview
  try {
    const crm = getCrmOverview();
    if (crm.totalClients > 0 || crm.totalLeads > 0) {
      checks.push(pass("crm", "Client CRM", `${crm.totalLeads} lead(s), ${crm.totalClients} client(s), $${crm.pipelineValue.toLocaleString()} pipeline`, "/crm"));
    } else {
      checks.push(warn("crm", "Client CRM", "No leads or clients — create at /crm", "/crm"));
      recommendations.push("Add leads or clients at /crm to test the CRM flow.");
    }
  } catch {
    checks.push(warn("crm", "Client CRM", "Could not read CRM state", "/crm"));
  }

  // 7. Revenue overview
  try {
    const rev = getRevenueOverview();
    if (rev.totalProposals > 0 || rev.totalInvoices > 0) {
      checks.push(pass("revenue", "Revenue System", `${rev.totalProposals} proposal(s), ${rev.totalInvoices} invoice(s)`, "/revenue"));
    } else {
      checks.push(warn("revenue", "Revenue System", "No proposals or invoices yet", "/revenue"));
      recommendations.push("Create a proposal at /revenue to test the billing flow.");
    }
  } catch {
    checks.push(warn("revenue", "Revenue System", "Could not read revenue state", "/revenue"));
  }

  // 8. Distribution overview
  try {
    const dist = getDistributionOverview();
    if (dist.publishedAssets > 0 || dist.activeCampaigns > 0) {
      checks.push(pass("distribution", "Distribution Engine", `${dist.publishedAssets} published, ${dist.activeCampaigns} campaign(s)`, "/distribution"));
    } else {
      checks.push(warn("distribution", "Distribution Engine", "No published assets or active campaigns", "/distribution"));
      recommendations.push("Publish an asset at /distribution to test the distribution flow.");
    }
  } catch {
    checks.push(warn("distribution", "Distribution Engine", "Could not read distribution state", "/distribution"));
  }

  // 9. Runtime agents
  try {
    const agents = getAllAgentStates();
    if (agents.length >= 6) {
      checks.push(pass("runtime", "Runtime Agents", `${agents.length} agents available`, "/runtime"));
    } else {
      checks.push(warn("runtime", "Runtime Agents", `Only ${agents.length} agent(s) — expected 6`, "/runtime"));
    }
  } catch {
    checks.push(warn("runtime", "Runtime Agents", "Could not read agent state", "/runtime"));
  }

  // 10. Autopilot sessions
  try {
    const sessions = listSessions();
    const activeSessions = sessions.filter((s) => s.status === "running" || s.status === "completed");
    if (sessions.length > 0) {
      checks.push(pass("autopilot", "Autopilot Sessions", `${sessions.length} session(s), ${activeSessions.length} active/completed`, "/autopilot"));
    } else {
      checks.push(fail("autopilot", "Autopilot Sessions", "No autopilot sessions — launch a mission", "/autopilot"));
      recommendations.push("Launch a mission at /projects/new to start an autopilot session.");
    }
  } catch {
    checks.push(warn("autopilot", "Autopilot Sessions", "Could not read session state", "/autopilot"));
  }

  // 11. Delivery package
  try {
    const sessions = listSessions();
    const withPkg = sessions.filter((s) => {
      try { return loadDeliveryPackage(s.sessionId) !== null; } catch { return false; }
    });
    if (withPkg.length > 0) {
      checks.push(pass("delivery_pkg", "Delivery Package", `${withPkg.length} session(s) with package`, "/autopilot"));
    } else {
      checks.push(warn("delivery_pkg", "Delivery Package", "No delivery packages generated yet", "/autopilot"));
      recommendations.push("Generate a delivery package from a completed autopilot session.");
    }
  } catch {
    checks.push(warn("delivery_pkg", "Delivery Package", "Could not check delivery packages", "/autopilot"));
  }

  // 12. Quality review
  try {
    const sessions = listSessions();
    const withReview = sessions.filter((s) => {
      try { return loadReviewReport(s.sessionId) !== null; } catch { return false; }
    });
    if (withReview.length > 0) {
      const report = loadReviewReport(withReview[0].sessionId);
      checks.push(pass("quality_review", "Quality Review", `${withReview.length} review(s), score ${report?.globalScore ?? "N/A"}`, "/autopilot"));
    } else {
      checks.push(warn("quality_review", "Quality Review", "No quality reviews completed yet", "/autopilot"));
      recommendations.push("Run a quality review on deliverables from a completed session.");
    }
  } catch {
    checks.push(warn("quality_review", "Quality Review", "Could not check review state", "/autopilot"));
  }

  // Calculate score
  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const warnings = checks.filter((c) => c.status === "warn").length;
  const totalChecks = checks.length;
  const score = Math.round((passed / Math.max(totalChecks, 1)) * 100);

  // Add default recommendations if score is low
  if (score < 50 && recommendations.length === 0) {
    recommendations.push("Seed demo data at /demo to populate the entire system.");
  }

  return {
    score,
    totalChecks,
    passed,
    failed,
    warnings,
    checks,
    runAt: new Date().toISOString(),
    recommendations,
  };
}
