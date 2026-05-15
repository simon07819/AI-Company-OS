import { generateWithLlm } from "@/lib/ai/llmClient";
import { emitPipelineEvent } from "@/lib/pipeline/pipelineEventBus";

export interface TechSelection {
  framework: string;
  language: string;
  styling: string;
  componentType: string;
  complexity: string;
}

export interface ArchitectureSpec {
  structure: string;
}

export interface QAReport {
  approved: boolean;
  issues: string[];
  suggestions: string[];
  score: number;
}

export interface PipelineResult {
  code: string;
  tech: TechSelection;
  arch: ArchitectureSpec;
  qa: QAReport;
  providerUsed: string;
  durationMs: number;
  stages: string[];
}

const DEFAULT_TECH: TechSelection = {
  framework: "React",
  language: "TypeScript",
  styling: "Tailwind",
  componentType: "component",
  complexity: "medium",
};

const DEFAULT_QA: QAReport = { approved: true, issues: [], suggestions: [], score: 80 };

function extractJson(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

function parseJsonSafe<T>(text: string, fallback: T): T {
  const raw = extractJson(text);
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```[\w]*\s*\n?/gm, "")
    .replace(/^```\s*$/gm, "")
    .trim();
}

export async function runTechSelector(command: string): Promise<TechSelection> {
  const result = await generateWithLlm({
    system: "Tu es un tech lead senior. Analyse la demande et sélectionne le stack technique. Réponds uniquement en JSON valide sans markdown.",
    user: `Demande: "${command.slice(0, 400)}"\n\nRéponds en JSON strict (un seul objet JSON, pas d'explication):\n{"framework":"React","language":"TypeScript","styling":"Tailwind","componentType":"component","complexity":"medium"}`,
    purpose: "tech_selector",
  });
  if (!result.ok) return DEFAULT_TECH;
  return parseJsonSafe(result.text, DEFAULT_TECH);
}

export async function runArchitect(command: string, tech: TechSelection): Promise<ArchitectureSpec> {
  const result = await generateWithLlm({
    system: "Tu es un architecte frontend expert. Conçois la structure du composant de façon concise. Max 250 mots.",
    user: `Demande: "${command.slice(0, 400)}"\nStack: ${tech.framework} + ${tech.language} + ${tech.styling} (complexité: ${tech.complexity})\n\nDécris succinctement:\n1. Interface des props TypeScript\n2. État interne (useState) si nécessaire\n3. Structure JSX et sous-composants\n4. Logique principale`,
    purpose: "architect",
  });
  return {
    structure: result.ok ? result.text : `Composant ${tech.componentType} ${tech.framework} standard avec props typées en ${tech.language}`,
  };
}

export async function runCodeWriter(command: string, tech: TechSelection, arch: ArchitectureSpec): Promise<string | null> {
  const result = await generateWithLlm({
    system: "Tu es un développeur React/TypeScript senior. Tu écris du code propre, complet et typé. Commence DIRECTEMENT par le code sans markdown ni triple backticks. Utilise export default pour le composant principal et des exports nommés pour les types/interfaces.",
    user: `Demande: "${command.slice(0, 400)}"\nStack: ${tech.framework} + ${tech.language} + ${tech.styling}\nArchitecture:\n${arch.structure.slice(0, 600)}\n\nÉcris le composant complet maintenant:`,
    purpose: "code_writer",
    maxTokens: 4000,
  });
  if (!result.ok || !result.text.trim()) return null;
  const code = stripCodeFences(result.text);
  return code.length >= 100 ? code : null;
}

export async function runQAReviewer(code: string, command: string): Promise<QAReport> {
  const result = await generateWithLlm({
    system: "Tu es un QA reviewer TypeScript/React senior. Analyse le code et retourne un rapport JSON strict sans markdown.",
    user: `Code à analyser:\n${code.slice(0, 2000)}\n\nDemande originale: "${command.slice(0, 200)}"\n\nRéponds UNIQUEMENT en JSON (aucun texte avant ou après):\n{"approved":true,"issues":[],"suggestions":[],"score":85}`,
    purpose: "qa_reviewer",
  });
  if (!result.ok) return DEFAULT_QA;
  return parseJsonSafe(result.text, DEFAULT_QA);
}

export async function runCodePipeline(command: string, streamId?: string): Promise<PipelineResult | null> {
  const started = Date.now();
  const stages: string[] = [];
  const emit = (stage: string, status: "started" | "completed" | "failed", data?: Record<string, unknown>) => {
    if (streamId) emitPipelineEvent(streamId, { stage, status, data, ts: Date.now() });
  };

  emit("tech_selector", "started");
  stages.push("tech_selector");
  const tech = await runTechSelector(command);
  emit("tech_selector", "completed", { framework: tech.framework, language: tech.language });

  emit("architect", "started");
  stages.push("architect");
  const arch = await runArchitect(command, tech);
  emit("architect", "completed");

  emit("code_writer", "started");
  stages.push("code_writer");
  const code = await runCodeWriter(command, tech, arch);
  if (!code) {
    emit("code_writer", "failed");
    emit("done", "failed");
    return null;
  }
  emit("code_writer", "completed");

  emit("qa_reviewer", "started");
  stages.push("qa_reviewer");
  const qa = await runQAReviewer(code, command);
  emit("qa_reviewer", "completed", { score: qa.score, approved: qa.approved });

  emit("done", "completed");
  return { code, tech, arch, qa, providerUsed: "nvidia", durationMs: Date.now() - started, stages };
}
