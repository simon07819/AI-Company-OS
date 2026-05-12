"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useOptionalViewMode } from "@/components/os/ViewModeProvider";
import CEOCommandComposer from "./CEOCommandComposer";
import CEOMissionStatus from "./CEOMissionStatus";
import CEOResultStage from "./CEOResultStage";
import type { CEOActionResult, CEOCurrentMission, CEOCurrentResult, CEORequestType } from "./types";

interface ApiAction {
  type: string;
  label: string;
  targetId?: string;
  href?: string;
  artifactPaths?: string[];
  summary?: string;
  kind?: string;
  limitations?: string[];
  launchInstructions?: string[];
  qualityStatus?: string;
  qualityScore?: number;
}

interface ApiMessage {
  id: string;
  role: "user" | "ceo";
  text: string;
  actions?: ApiAction[];
  timestamp: string;
}

function detectRequestType(prompt: string): CEORequestType {
  const normalized = prompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\blogo\b/.test(normalized)) return "branding";
  if (/branding|identite|marque/.test(normalized)) return "branding";
  if (/\bsaas\b|logiciel/.test(normalized)) return "saas";
  if (/site web|site internet|website|landing/.test(normalized)) return "website";
  if (/\bapp\b|application/.test(normalized)) return "app";
  if (/automation|automatisation|workflow|systeme|système/.test(normalized)) return "business-system";
  return "unknown";
}

function titleFromAction(action: CEOActionResult) {
  return action.label.replace(/^Projet créé:\s*/i, "").trim() || "Projet généré";
}

function statusFromAction(action: CEOActionResult): CEOCurrentMission["status"] {
  if (!action.artifactPaths.length) return "rejected";
  if (action.qualityStatus === "Prêt") return "ready";
  if (action.qualityStatus === "Incomplet") return "rejected";
  return "needs_revision";
}

function normalizeWorkspaceHref(action: CEOActionResult) {
  if (action.href?.startsWith("/projects/")) return action.href;
  if (action.targetId) return `/projects/${action.targetId}`;
  return undefined;
}

function actionFromMessage(message: ApiMessage | null): CEOActionResult | null {
  const action = message?.actions?.find((item) => item.type === "product_artifacts_created");
  if (!action) return null;
  return {
    label: action.label,
    targetId: action.targetId,
    href: action.href,
    kind: action.kind,
    artifactPaths: action.artifactPaths ?? [],
    summary: action.summary,
    limitations: action.limitations,
    launchInstructions: action.launchInstructions,
    qualityStatus: action.qualityStatus,
    qualityScore: action.qualityScore,
  };
}

function missionFromAction(prompt: string, action: CEOActionResult): CEOCurrentMission {
  const status = statusFromAction(action);
  return {
    id: action.targetId ?? `mission-${Date.now()}`,
    prompt,
    requestType: (action.kind as CEORequestType) || detectRequestType(prompt),
    status,
    createdAt: new Date().toISOString(),
    artifactCount: action.artifactPaths.length,
    workspaceHref: normalizeWorkspaceHref(action),
    qualityScore: action.qualityScore,
  };
}

function resultFromAction(prompt: string, action: CEOActionResult): CEOCurrentResult {
  const status = statusFromAction(action);
  return {
    title: titleFromAction(action),
    requestType: (action.kind as CEORequestType) || detectRequestType(prompt),
    status,
    summary: action.summary || "Résultat produit avec artifacts traçables.",
    artifactPaths: action.artifactPaths,
    workspaceHref: normalizeWorkspaceHref(action),
    qualityScore: action.qualityScore,
    qualityStatus: action.qualityStatus,
    limitations: action.limitations,
    launchInstructions: action.launchInstructions,
  };
}

export default function CEOCommandSurface() {
  const viewMode = useOptionalViewMode();
  const isExpert = viewMode?.isExpert ?? false;
  const toggleMode = viewMode?.toggleMode ?? (() => undefined);
  const [mission, setMission] = useState<CEOCurrentMission | null>(null);
  const [result, setResult] = useState<CEOCurrentResult | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      try {
        const response = await fetch("/api/ceo/simple-agency", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        const messages = (payload.view?.messages ?? []) as ApiMessage[];
        const latestUser = [...messages].reverse().find((message) => message.role === "user")?.text ?? "";
        if (latestUser) setMission({ id: "last-command", prompt: latestUser, requestType: detectRequestType(latestUser), status: "idle", createdAt: new Date().toISOString(), artifactCount: 0 });
        setHistory(messages.filter((message) => message.role === "user").slice(-4).map((message) => message.text));
      } catch {
        if (!cancelled) setError("Impossible de charger l’état CEO.");
      }
    }
    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  const historyItems = useMemo(() => history.filter(Boolean).slice(-3).reverse(), [history]);

  const submitCommand = async (prompt: string) => {
    const requestType = detectRequestType(prompt);
    const pendingMission: CEOCurrentMission = {
      id: `local-${Date.now()}`,
      prompt,
      requestType,
      status: "production",
      createdAt: new Date().toISOString(),
      artifactCount: 0,
    };
    setLoading(true);
    setError(null);
    setMission(pendingMission);
    setResult(null);
    setHistory((items) => [...items.filter((item) => item !== prompt), prompt].slice(-6));

    try {
      const response = await fetch("/api/ceo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: prompt }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.message || "La production a échoué.");
      const action = actionFromMessage(payload.response ?? null);
      if (!action) {
        setMission({ ...pendingMission, status: "rejected" });
        setResult({
          title: "Aucun artifact réel créé",
          requestType,
          status: "rejected",
          summary: "La mission a répondu sans artifact traçable. Le système refuse de l’afficher comme résultat prêt.",
          artifactPaths: [],
        });
        return;
      }
      setMission(missionFromAction(prompt, action));
      setResult(resultFromAction(prompt, action));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue.";
      setMission({ ...pendingMission, status: "error" });
      setResult(null);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="ceo-os-page">
      <section className="ceo-os-shell" aria-label="Command Surface">
        <header className="ceo-os-topbar">
          <div>
            <span>AI Company OS</span>
            <strong>CEO</strong>
          </div>
          <div className="ceo-os-system-state">
            <i />
            <span>Production IA active</span>
            <button type="button" onClick={toggleMode}>{isExpert ? "Mode simple" : "Mode expert"}</button>
          </div>
        </header>

        <section className="ceo-os-hero">
          <div>
            <div className="ceo-os-eyebrow"><Sparkles size={14} /> Command Center</div>
            <h1>Décris ce que tu veux construire.</h1>
            <p>Le CEO comprend la demande, route les experts, génère des artifacts réels et refuse les faux succès.</p>
          </div>
          <CEOCommandComposer loading={loading} onSubmit={submitCommand} />
        </section>

        <CEOMissionStatus mission={mission} />

        <CEOResultStage
          result={result}
          mission={mission}
          expertMode={isExpert}
          loading={loading}
          error={error}
          onModify={() => document.querySelector<HTMLTextAreaElement>(".ceo-os-composer textarea")?.focus()}
          onContinue={() => document.querySelector<HTMLTextAreaElement>(".ceo-os-composer textarea")?.focus()}
        />

        {historyItems.length > 0 && (
          <details className="ceo-os-history">
            <summary>Historique compact</summary>
            <div>
              {historyItems.map((item) => <span key={item}>{item}</span>)}
            </div>
          </details>
        )}

        <div className="ceo-os-footer-links">
          <Link href="/projects">Projets</Link>
          <Link href="/outputs">Résultats</Link>
          <Link href="/ceo/expert">Vue CEO expert</Link>
        </div>
      </section>
    </main>
  );
}
