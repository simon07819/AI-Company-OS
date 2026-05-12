import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { executeProductionMission } from "@/lib/orchestrator/missionExecutor";
import { readGeneratedProject } from "@/lib/product-builder/workspace";
import { runCompanyWorkflow } from "@/agents/workflows/company-workflow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function artifactExists(artifactPath: string) {
  const absolute = path.isAbsolute(artifactPath) ? artifactPath : path.resolve(process.cwd(), artifactPath);
  return fs.existsSync(absolute);
}

function firstVisualArtifact(artifactPaths: string[]) {
  return artifactPaths.find((artifactPath) => /final-logo\.svg$/i.test(artifactPath))
    ?? artifactPaths.find((artifactPath) => /\.svg$/i.test(artifactPath))
    ?? null;
}

function readTextArtifact(artifactPath: string | null) {
  if (!artifactPath) return null;
  const absolute = path.isAbsolute(artifactPath) ? artifactPath : path.resolve(process.cwd(), artifactPath);
  if (!fs.existsSync(absolute)) return null;
  return fs.readFileSync(absolute, "utf-8");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json({
        ok: false,
        status: "failed",
        error: "Prompt manquant.",
        artifactPaths: [],
        artifacts: [],
      }, { status: 400 });
    }

    const run = executeProductionMission(prompt);
    const companyWorkflow = runCompanyWorkflow(prompt);
    const workOrder = companyWorkflow.workOrder;
    const artifactPaths = run.manifest.artifactPaths.filter(artifactExists);
    const missingArtifacts = run.manifest.artifactPaths.filter((artifactPath) => !artifactExists(artifactPath));
    const workspace = readGeneratedProject(run.projectSlug);
    const hasArtifacts = artifactPaths.length > 0;
    const primaryVisualPath = typeof run.manifest.primaryVisualPath === "string" && artifactExists(run.manifest.primaryVisualPath)
      ? run.manifest.primaryVisualPath
      : firstVisualArtifact(artifactPaths);
    const filePrimaryVisual = readTextArtifact(primaryVisualPath);
    const workflowVisibleOutput = companyWorkflow.visibleOutput as { primaryVisual?: string } | null;
    const primaryVisual = workflowVisibleOutput?.primaryVisual ?? filePrimaryVisual;

    if (!hasArtifacts) {
      return NextResponse.json({
        ok: false,
        missionId: run.id,
        projectId: run.projectSlug,
        title: run.manifest.title,
        requestType: run.plan.requestType,
        brandName: run.plan.brandName ?? null,
        deliverableType: run.plan.requestType === "branding" && workOrder.deliverableType === "logo" ? "logo" : run.plan.requestType,
        status: "failed",
        summary: "La production n'a créé aucun artifact réel.",
        artifactPaths: [],
        artifacts: [],
        workspaceHref: null,
        qualityScore: run.manifest.qualityScore,
        error: "Aucun fichier traçable n'a été créé. Le projet n'est pas marqué prêt.",
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      missionId: run.id,
      projectId: run.projectSlug,
      title: run.manifest.title,
      requestType: run.plan.requestType,
      brandName: run.plan.brandName ?? null,
      deliverableType: run.plan.requestType === "branding" && workOrder.deliverableType === "logo" ? "logo" : run.plan.requestType,
      status: run.status === "ready" ? "ready" : run.status === "needs_revision" ? "needs_revision" : "rejected",
      summary: run.manifest.summary,
      shortMessage: run.plan.requestType === "branding" && run.plan.brandName && /\blogo\b/i.test(prompt)
        ? `Voici une première version du logo ${run.plan.brandName}.`
        : undefined,
      primaryVisualPath,
      primaryVisual,
      artifactPaths,
      artifacts: artifactPaths.map((artifactPath) => ({
        path: artifactPath,
        title: path.basename(artifactPath),
        exists: true,
      })),
      missingArtifacts,
      workspaceHref: workspace ? `/projects/${run.projectSlug}` : null,
      qualityScore: run.manifest.qualityScore,
      qualityStatus: run.status === "ready" ? "Prêt" : run.status === "needs_revision" ? "À améliorer" : "Incomplet",
      limitations: run.manifest.limitations ?? [],
      launchInstructions: run.manifest.launch ?? [],
      expert: {
        plan: run.plan,
        qualityReport: run.qualityReports.at(-1) ?? null,
        revisions: run.revisions,
        manifest: run.manifest,
        designTeam: run.manifest.designTeam ?? null,
        companyWorkflow: {
          workflow: companyWorkflow.workflow,
          workOrder: companyWorkflow.workOrder,
          missionPlan: companyWorkflow.missionPlan,
          agentRuns: companyWorkflow.agentRuns,
          hiddenDetails: companyWorkflow.hiddenDetails,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    return NextResponse.json({
      ok: false,
      status: "failed",
      error: message,
      artifactPaths: [],
      artifacts: [],
    }, { status: 500 });
  }
}
