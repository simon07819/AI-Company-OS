"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Save, MessageSquare } from "lucide-react";

interface TextField { type: "text"; label: string; value: string; selector: string }
interface ColorField { type: "color"; label: string; value: string; selector: string }
type EditField = TextField | ColorField;

function extractFields(html: string): EditField[] {
  const fields: EditField[] = [];
  const seen = new Set<string>();

  // Extract text content from key elements
  const textRe = /<(h[1-6]|p|button|a|span|li|label|title)[^>]*>([^<]{3,80})<\/\1>/gi;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = textRe.exec(html)) !== null && fields.length < 12) {
    const text = m[2].trim().replace(/\s+/g, " ");
    if (!seen.has(text) && !/^\s*$/.test(text)) {
      seen.add(text);
      fields.push({ type: "text", label: `${m[1].toUpperCase()} — ${text.slice(0, 30)}`, value: text, selector: text });
      idx++;
    }
  }

  // Extract colors
  const colorRe = /(background(?:-color)?|color|fill|stroke)\s*:\s*(#[0-9a-fA-F]{6})/g;
  const colors = new Set<string>();
  while ((m = colorRe.exec(html)) !== null && colors.size < 6) {
    const hex = m[2].toLowerCase();
    if (!colors.has(hex)) {
      colors.add(hex);
      fields.push({ type: "color", label: `Couleur ${m[1]}`, value: hex, selector: hex });
    }
  }

  return fields;
}

interface ContentEditorProps {
  artifactId: string;
  initialContent: string;
  title: string;
  onClose: () => void;
  onRequestCEO: (msg: string) => void;
}

export default function ContentEditor({ artifactId, initialContent, title, onClose, onRequestCEO }: ContentEditorProps) {
  const [fields, setFields] = useState<EditField[]>(() => extractFields(initialContent));
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update iframe content live via srcdoc
  const liveContent = useRef(content);
  liveContent.current = content;

  const applyChange = useCallback((field: EditField, newValue: string) => {
    setFields((prev) => prev.map((f) => f.selector === field.selector ? { ...f, value: newValue } as EditField : f));
    setContent((prev) => {
      let updated = prev;
      if (field.type === "text") {
        updated = prev.replace(field.value, newValue);
      } else if (field.type === "color") {
        updated = prev.replaceAll(field.selector, newValue);
      }
      // Send to iframe
      iframeRef.current?.contentWindow?.postMessage({ type: "content-update", html: updated }, "*");
      return updated;
    });
    setSaved(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/deliverables/${artifactId}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleAskCEO = () => {
    const changes = fields.filter((f) => f.value !== extractFields(initialContent).find((x) => x.selector === f.selector)?.value);
    const msg = changes.length
      ? `Modifie le livrable: ${changes.map((c) => `${c.label} → "${c.value}"`).join(", ")}`
      : "Améliore le rendu actuel";
    onRequestCEO(msg);
    onClose();
  };

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "content-update", html: content }, "*");
  }, [content]);

  return (
    <div className="content-editor-overlay" role="dialog" aria-label="Éditeur de contenu">
      <div className="content-editor-panel">
        {/* Header */}
        <div className="content-editor-header">
          <span className="content-editor-title">✏️ Modifier — {title}</span>
          <button type="button" className="brief-modal-close" onClick={onClose} aria-label="Fermer"><X size={15} /></button>
        </div>

        {/* Side-by-side layout */}
        <div className="content-editor-body">
          {/* Fields panel */}
          <div className="content-editor-fields">
            <div className="content-editor-section-label">Textes</div>
            {fields.filter((f) => f.type === "text").map((f, i) => (
              <div key={i} className="content-editor-field">
                <label className="brief-label">{f.label}</label>
                <input
                  className="brief-input"
                  type="text"
                  value={f.value}
                  onChange={(e) => applyChange(f, e.target.value)}
                />
              </div>
            ))}

            <div className="content-editor-section-label" style={{ marginTop: 12 }}>Couleurs</div>
            {fields.filter((f) => f.type === "color").map((f, i) => (
              <div key={i} className="content-editor-field content-editor-color-field">
                <label className="brief-label">{f.label}</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={f.value} onChange={(e) => applyChange(f, e.target.value)} style={{ width: 36, height: 28, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }} />
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{f.value}</span>
                </div>
              </div>
            ))}

            {fields.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", padding: "12px 0" }}>Aucun champ détecté.</p>
            )}
          </div>

          {/* Live preview */}
          <div className="content-editor-preview">
            <iframe
              ref={iframeRef}
              srcDoc={content}
              title="Aperçu live"
              style={{ width: "100%", height: "100%", border: "none" }}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="content-editor-footer">
          <button type="button" className="brief-cancel-btn" onClick={handleAskCEO}>
            <MessageSquare size={13} /> Demander au CEO
          </button>
          <button type="button" className="brief-submit-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Sauvegarde..." : saved ? "✓ Sauvegardé" : <><Save size={13} /> Sauvegarder</>}
          </button>
        </div>
      </div>
    </div>
  );
}
