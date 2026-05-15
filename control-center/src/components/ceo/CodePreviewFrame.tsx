"use client";

import { useState } from "react";
import { Code2, Copy, ExternalLink } from "lucide-react";

interface CodePreviewFrameProps {
  artifactId: string;
  code: string;
  title: string;
}

export default function CodePreviewFrame({ artifactId, code, title }: CodePreviewFrameProps) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="code-preview-frame">
      <div className="code-preview-toolbar">
        <div className="code-preview-tabs">
          <button
            className={`code-preview-tab${tab === "preview" ? " active" : ""}`}
            onClick={() => setTab("preview")}
          >
            Preview
          </button>
          <button
            className={`code-preview-tab${tab === "code" ? " active" : ""}`}
            onClick={() => setTab("code")}
          >
            <Code2 size={11} />
            Code
          </button>
        </div>
        <div className="code-preview-actions">
          <button className="code-preview-action-btn" onClick={handleCopy} title="Copier le code">
            <Copy size={12} />
            {copied ? "Copié" : "Copier"}
          </button>
          <a
            className="code-preview-action-btn"
            href={`/api/preview/${artifactId}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Ouvrir dans un nouvel onglet"
          >
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {tab === "preview" ? (
        <iframe
          key={artifactId}
          src={`/api/preview/${artifactId}`}
          className="code-preview-iframe"
          sandbox="allow-scripts"
          title={title}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="code-preview-source">
          <pre><code>{code}</code></pre>
        </div>
      )}
    </div>
  );
}
