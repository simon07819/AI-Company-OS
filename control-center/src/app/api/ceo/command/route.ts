import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { executeProductionMission } from "@/lib/orchestrator/missionExecutor";
import { readGeneratedProject } from "@/lib/product-builder/workspace";
import { createWorkOrderFromPrompt } from "@/lib/ceoWorkOrder";

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

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function websitePreviewSvg(prompt: string, brandName: string | null, title: string) {
  const workOrder = createWorkOrderFromPrompt(prompt);
  const brand = escapeXml(brandName || workOrder.brandName || title.replace(/\s+website$/i, "") || "EKIDA");
  const apparel = workOrder.industry === "apparel";
  const contentMode = workOrder.contentMode === "temporary";
  const hero = apparel ? "Essentiels de linge modernes" : "Une présence web claire";
  const sub = contentMode
    ? "Contenu temporaire pour valider la direction, la structure et le ton."
    : "Une première page structurée avec proposition de valeur et sections clés.";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 760" role="img" aria-label="Preview site web ${brand}">
  <rect width="1100" height="760" rx="44" fill="#f6f1e8"/>
  <rect x="48" y="44" width="1004" height="672" rx="34" fill="#fffdf8" stroke="#ded8cc"/>
  <g transform="translate(92 82)">
    <text x="0" y="28" fill="#111827" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="900" letter-spacing="3">${brand}</text>
    <text x="520" y="26" fill="#64748b" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800">Collection</text>
    <text x="650" y="26" fill="#64748b" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800">À propos</text>
    <text x="766" y="26" fill="#64748b" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800">Contact</text>
    <rect x="854" y="0" width="108" height="42" rx="21" fill="#111827"/>
    <text x="908" y="27" text-anchor="middle" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="900">Acheter</text>
  </g>
  <g transform="translate(92 166)">
    <rect x="0" y="0" width="916" height="286" rx="30" fill="#111827"/>
    <circle cx="760" cy="74" r="116" fill="#d7b98c" opacity="0.24"/>
    <circle cx="842" cy="214" r="142" fill="#f7f3ea" opacity="0.12"/>
    <text x="54" y="88" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="58" font-weight="950" letter-spacing="-1">${escapeXml(hero)}</text>
    <text x="58" y="142" fill="#cbd5e1" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700">${escapeXml(sub)}</text>
    <rect x="58" y="184" width="154" height="50" rx="25" fill="#d7b98c"/>
    <text x="135" y="216" text-anchor="middle" fill="#111827" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="950">Voir la collection</text>
    <g transform="translate(644 70)">
      <rect x="0" y="0" width="168" height="190" rx="28" fill="#f8fafc"/>
      <path d="M54 44c16-20 44-20 60 0l28 36-32 18v58H58V98L26 80l28-36Z" fill="#d7b98c"/>
      <path d="M84 28v136" stroke="#111827" stroke-width="7" stroke-linecap="round" opacity="0.22"/>
    </g>
  </g>
  <g transform="translate(92 500)">
    <rect x="0" y="0" width="286" height="150" rx="24" fill="#f7f3ea" stroke="#e5dfd2"/>
    <rect x="315" y="0" width="286" height="150" rx="24" fill="#f7f3ea" stroke="#e5dfd2"/>
    <rect x="630" y="0" width="286" height="150" rx="24" fill="#f7f3ea" stroke="#e5dfd2"/>
    <text x="30" y="56" fill="#111827" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="900">Nouveautés</text>
    <text x="345" y="56" fill="#111827" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="900">Confort quotidien</text>
    <text x="660" y="56" fill="#111827" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="900">Lookbook</text>
    <text x="30" y="94" fill="#64748b" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700">Sélection temporaire.</text>
    <text x="345" y="94" fill="#64748b" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700">Matières et coupes.</text>
    <text x="660" y="94" fill="#64748b" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700">Images à remplacer.</text>
  </g>
</svg>`;
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
    const artifactPaths = run.manifest.artifactPaths.filter(artifactExists);
    const missingArtifacts = run.manifest.artifactPaths.filter((artifactPath) => !artifactExists(artifactPath));
    const workspace = readGeneratedProject(run.projectSlug);
    const hasArtifacts = artifactPaths.length > 0;
    const primaryVisualPath = typeof run.manifest.primaryVisualPath === "string" && artifactExists(run.manifest.primaryVisualPath)
      ? run.manifest.primaryVisualPath
      : firstVisualArtifact(artifactPaths);
    const filePrimaryVisual = readTextArtifact(primaryVisualPath);
    const primaryVisual = run.plan.requestType === "website"
      ? websitePreviewSvg(prompt, run.plan.brandName ?? null, run.manifest.title)
      : filePrimaryVisual;

    if (!hasArtifacts) {
      return NextResponse.json({
        ok: false,
        missionId: run.id,
        projectId: run.projectSlug,
        title: run.manifest.title,
        requestType: run.plan.requestType,
        brandName: run.plan.brandName ?? null,
        deliverableType: run.plan.requestType === "branding" && createWorkOrderFromPrompt(prompt).deliverableType === "logo" ? "logo" : run.plan.requestType,
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
      deliverableType: run.plan.requestType === "branding" && createWorkOrderFromPrompt(prompt).deliverableType === "logo" ? "logo" : run.plan.requestType,
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
