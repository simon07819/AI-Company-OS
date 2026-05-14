import { getMessages, type CeoMessage } from "./ceoCommand";
import { listSessions, type AutopilotLog, type AutopilotSession } from "./autopilotStore";
import { listCeoProjects, type CeoProject } from "./ceoProjectStore";
import { getApprovalPreview, type ApprovalItem, type ApprovalPreview } from "./approvalPreview";
import { listWorkspaces, type CompanyWorkspace } from "./companyWorkspace";
import { listGeneratedProjects, type GeneratedProjectSummary } from "./product-builder/workspace";
import { getAllOutputs, type OutputVisualPreview, type VisibleOutput } from "./visibleOutputs";

export interface SimpleCompany {
  id: string;
  name: string;
  type: string;
  status: string;
  avatar: string;
  projectsCount: number;
  projectIds: string[];
  hasPendingApproval: boolean;
  lastResult?: VisibleOutput;
}

export interface SimpleApproval {
  item: ApprovalItem;
  preview: ApprovalPreview | null;
  visualPreview: OutputVisualPreview | null;
  canApprove: boolean;
}

export interface SimpleAgencyViewModel {
  messages: CeoMessage[];
  projects: CeoProject[];
  sessions: AutopilotSession[];
  outputs: VisibleOutput[];
  approvals: SimpleApproval[];
  companies: SimpleCompany[];
  generatedProjects: GeneratedProjectSummary[];
  logs: AutopilotLog[];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CO";
}

function companyStatus(workspace: CompanyWorkspace, sessions: AutopilotSession[]) {
  const missionIds = new Set(workspace.activeMissionIds);
  const workspaceSessions = sessions.filter((session) => missionIds.has(session.sessionId));
  if (workspaceSessions.some((session) => session.status === "waiting_approval")) return "Attend ton avis";
  if (workspaceSessions.some((session) => session.status === "running")) return "Agents au travail";
  if (workspaceSessions.some((session) => session.status === "completed")) return "Resultat pret";
  return workspace.metrics.totalMissions > 0 ? "Pret a continuer" : "Pret a lancer";
}

function visualFromPreview(preview: ApprovalPreview | null): OutputVisualPreview | null {
  const image = preview?.files?.find((file) => file.imageUrl);
  if (image?.imageUrl) {
    return {
      kind: "image",
      imageUrl: image.imageUrl,
      imageAlt: image.name,
      colors: ["#0f172a", "#38bdf8", "#f8fafc", "#f59e0b"],
    };
  }
  return preview?.outputs?.find((output) => output.visualPreview)?.visualPreview ?? null;
}

const LEGACY_VISIBLE_PATTERN = /Brand system|Marque à nommer|Approval Preview|Prototype visuel|legacy|fallback|mock|fake|test-results|old generic/i;

function isCurrentVisibleRecord(...values: Array<unknown>) {
  return !LEGACY_VISIBLE_PATTERN.test(values.filter((value): value is string => typeof value === "string").join("\n"));
}

export function getSimpleAgencyViewModel(): SimpleAgencyViewModel {
  const messages = getMessages(80);
  const projects = listCeoProjects({ includeArchived: false })
    .filter((project) => isCurrentVisibleRecord(project.name, project.missionType, project.lastActivity));
  const sessions = listSessions();
  const outputs = getAllOutputs()
    .filter((output) => isCurrentVisibleRecord(output.title, output.summary, output.preview, output.type));
  const workspaces = listWorkspaces();
  const pendingApprovals: ApprovalItem[] = [];
  const generatedProjects = listGeneratedProjects()
    .filter((project) => isCurrentVisibleRecord(project.title, project.summary, project.requestType));

  const approvals = pendingApprovals
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20)
    .map((item) => {
    const preview = getApprovalPreview(item.id);
    const visualPreview = visualFromPreview(preview);
    return {
      item,
      preview,
      visualPreview,
      canApprove: !!visualPreview || !!preview?.invoice || !!preview?.mission || !!preview?.files?.some((file) => file.imageUrl || file.preview),
    };
  });

  const companies = workspaces
    .map((workspace) => {
      const projectIds = projects
        .filter((project) => project.workspaceId === workspace.id || (project.sessionId ? workspace.activeMissionIds.includes(project.sessionId) : false))
        .map((project) => project.id);
      const missionOutputs = outputs.filter((output) => workspace.activeMissionIds.includes(output.sessionId));
      return {
        id: workspace.id,
        name: workspace.name,
        type: workspace.industry,
        status: companyStatus(workspace, sessions),
        avatar: initials(workspace.name),
        projectsCount: projectIds.length,
        projectIds,
        hasPendingApproval: approvals.some((approval) => approval.item.sessionId && workspace.activeMissionIds.includes(approval.item.sessionId)),
        lastResult: missionOutputs[0],
      };
    })
    .filter((company) => company.projectsCount > 0 || company.lastResult || company.hasPendingApproval);

  const logs = sessions
    .flatMap((session) => session.logs.map((log) => ({ ...log, message: log.message || session.runtime.lastEvent })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 30);

  return {
    messages,
    projects,
    sessions,
    outputs,
    approvals,
    companies,
    generatedProjects,
    logs,
  };
}
