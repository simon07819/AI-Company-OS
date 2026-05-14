"use client";

import { useState } from "react";

interface TestResult {
  ok?: boolean;
  artifactCreated?: boolean;
  outputPath?: string;
  bytes?: number;
  statusCode?: number;
  endpointHost?: string | null;
  model?: string;
  mimeType?: string | null;
  error?: string;
  suggestedFix?: string;
  expectedFormat?: string;
  receivedFormat?: string;
  missing?: string[];
}

export default function NvidiaImageDiagnosticButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [copied, setCopied] = useState(false);

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/diagnostics/nvidia-image/test", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      setResult({ ...payload, ok: response.ok && payload.ok });
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : "Diagnostic NVIDIA image impossible." });
    } finally {
      setLoading(false);
    }
  };

  const copyRequiredConfig = async () => {
    const value = [
      "IMAGE_PROVIDER=nvidia",
      "NVIDIA_IMAGE_ENDPOINT=<endpoint NVIDIA image réel depuis build.nvidia.com>",
      "NVIDIA_IMAGE_MODEL=black-forest-labs/flux.1-dev",
      "NVIDIA_API_KEY=<déjà configurée si présente, ne jamais coller ici publiquement>",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="ceo-nvidia-diagnostic-test">
      <div className="ceo-nvidia-diagnostic-actions">
        <button className="os-button" type="button" onClick={runTest} disabled={loading}>
          {loading ? "Test NVIDIA en cours..." : "Tester NVIDIA Image"}
        </button>
        <button className="os-button subtle" type="button" onClick={copyRequiredConfig}>
          Copier config requise
        </button>
        {copied && <span>Config requise copiée sans secret.</span>}
      </div>
      <pre className="ceo-nvidia-config-template" aria-label="Configuration NVIDIA image requise">{[
        "IMAGE_PROVIDER=nvidia",
        "NVIDIA_IMAGE_ENDPOINT=<endpoint NVIDIA image réel depuis build.nvidia.com>",
        "NVIDIA_IMAGE_MODEL=black-forest-labs/flux.1-dev",
        "NVIDIA_API_KEY=<secret déjà présent ou à configurer sans jamais l’afficher>",
      ].join("\n")}</pre>
      {result && (
        <div className={`ceo-diagnostics-check ${result.ok ? "ok" : "warn"}`}>
          <strong>{result.ok ? "Succès NVIDIA Image" : "Échec NVIDIA Image"}</strong>
          <span>artifact test créé: {result.artifactCreated ? "oui" : "non"}</span>
          {result.outputPath && <span>{result.outputPath}</span>}
          {result.bytes ? <span>{result.bytes} bytes · {result.mimeType}</span> : null}
          {result.statusCode ? <span>status: {result.statusCode}</span> : null}
          {result.endpointHost ? <span>endpointHost: {result.endpointHost}</span> : null}
          {result.model ? <span>model: {result.model}</span> : null}
          {result.error ? <span>erreur: {result.error}</span> : null}
          {result.expectedFormat ? <span>attendu: {result.expectedFormat}</span> : null}
          {result.receivedFormat ? <span>reçu: {result.receivedFormat}</span> : null}
          {result.missing?.length ? <span>variables manquantes: {result.missing.join(", ")}</span> : null}
          {result.suggestedFix ? <span>{result.suggestedFix}</span> : null}
        </div>
      )}
    </div>
  );
}
