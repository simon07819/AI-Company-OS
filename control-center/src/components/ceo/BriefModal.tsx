"use client";

import { useState } from "react";
import { X } from "lucide-react";

export type BriefType = "branding" | "website" | "app";

interface BriefModalProps {
  initialType?: BriefType;
  initialName?: string;
  onSubmit: (prompt: string) => void;
  onClose: () => void;
}

const SECTEURS = ["tech", "mode", "food", "santé", "finance", "e-commerce", "éducation", "autre"];
const VALEURS = ["luxe", "accessible", "innovant", "local", "audacieux", "minimaliste", "durable", "fun"];
const TONS = ["sérieux", "chaleureux", "audacieux", "minimaliste", "premium", "humoristique"];
const PAGE_TYPES = ["Accueil", "À propos", "Services", "Portfolio", "Blog", "Contact", "Pricing", "FAQ"];
const SITE_TYPES = ["landing", "e-commerce", "SaaS", "portfolio", "blog", "corporate"];

function Toggle({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`brief-toggle${selected ? " selected" : ""}`}
      onClick={onToggle}
    >
      {label}
    </button>
  );
}

export default function BriefModal({ initialType = "branding", initialName = "", onSubmit, onClose }: BriefModalProps) {
  const [type, setType] = useState<BriefType>(initialType);
  const [name, setName] = useState(initialName);
  const [secteur, setSecteur] = useState("");
  const [valeurs, setValeurs] = useState<string[]>([]);
  const [cible, setCible] = useState("");
  const [ton, setTon] = useState<string[]>([]);
  const [references, setReferences] = useState("");
  const [couleursEviter, setCouleursEviter] = useState("");
  const [siteType, setSiteType] = useState("");
  const [pages, setPages] = useState<string[]>([]);
  const [cta, setCta] = useState("");
  const [fonctionnalites, setFonctionnalites] = useState("");

  const toggleArr = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    let prompt = "";

    if (type === "branding") {
      prompt = `Crée une identité de marque complète pour "${name}"`;
      if (secteur) prompt += ` dans le secteur ${secteur}`;
      if (valeurs.length) prompt += `. Valeurs: ${valeurs.join(", ")}`;
      if (cible) prompt += `. Cible: ${cible}`;
      if (ton.length) prompt += `. Ton: ${ton.join(", ")}`;
      if (references) prompt += `. Références: ${references}`;
      if (couleursEviter) prompt += `. Couleurs à éviter: ${couleursEviter}`;
      prompt += ". Inclus logo SVG, palette de couleurs, typographie et guidelines.";
    } else if (type === "website") {
      prompt = `Crée un site web ${siteType || "professionnel"} pour "${name}"`;
      if (secteur) prompt += ` (${secteur})`;
      if (pages.length) prompt += `. Pages: ${pages.join(", ")}`;
      if (cta) prompt += `. CTA principal: "${cta}"`;
      if (fonctionnalites) prompt += `. Fonctionnalités: ${fonctionnalites}`;
      if (ton.length) prompt += `. Ton: ${ton.join(", ")}`;
      if (cible) prompt += `. Cible: ${cible}`;
      prompt += ". HTML/CSS complet, responsive, moderne.";
    } else {
      prompt = `Conçois l'interface d'une app mobile "${name}"`;
      if (secteur) prompt += ` (${secteur})`;
      if (fonctionnalites) prompt += `. Fonctionnalités: ${fonctionnalites}`;
      if (cible) prompt += `. Utilisateurs cibles: ${cible}`;
      if (ton.length) prompt += `. Ton: ${ton.join(", ")}`;
      prompt += ". UI complète avec écrans principaux.";
    }

    onSubmit(prompt);
    onClose();
  };

  return (
    <div
      className="brief-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Nouveau brief"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="brief-modal">
        {/* Header */}
        <div className="brief-modal-header">
          <div className="brief-modal-tabs">
            {(["branding", "website", "app"] as BriefType[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`brief-tab${type === t ? " active" : ""}`}
                onClick={() => setType(t)}
              >
                {t === "branding" ? "🎨 Branding" : t === "website" ? "🌐 Site web" : "📱 App"}
              </button>
            ))}
          </div>
          <button type="button" className="brief-modal-close" onClick={onClose} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="brief-modal-body">
          <div className="brief-field">
            <label className="brief-label">Nom du projet *</label>
            <input
              className="brief-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ekida, Nova, Bloom..."
              autoFocus
            />
          </div>

          <div className="brief-field">
            <label className="brief-label">Secteur</label>
            <div className="brief-toggles">
              {SECTEURS.map((s) => (
                <Toggle key={s} label={s} selected={secteur === s} onToggle={() => setSecteur(secteur === s ? "" : s)} />
              ))}
            </div>
          </div>

          <div className="brief-field">
            <label className="brief-label">Valeurs</label>
            <div className="brief-toggles">
              {VALEURS.map((v) => (
                <Toggle key={v} label={v} selected={valeurs.includes(v)} onToggle={() => toggleArr(valeurs, setValeurs, v)} />
              ))}
            </div>
          </div>

          <div className="brief-field">
            <label className="brief-label">Cible principale</label>
            <input className="brief-input" type="text" value={cible} onChange={(e) => setCible(e.target.value)} placeholder="Ex: entrepreneurs 25-45 ans, PME tech..." />
          </div>

          <div className="brief-field">
            <label className="brief-label">Ton</label>
            <div className="brief-toggles">
              {TONS.map((t) => (
                <Toggle key={t} label={t} selected={ton.includes(t)} onToggle={() => toggleArr(ton, setTon, t)} />
              ))}
            </div>
          </div>

          {(type === "website" || type === "app") && (
            <>
              {type === "website" && (
                <div className="brief-field">
                  <label className="brief-label">Type de site</label>
                  <div className="brief-toggles">
                    {SITE_TYPES.map((s) => (
                      <Toggle key={s} label={s} selected={siteType === s} onToggle={() => setSiteType(siteType === s ? "" : s)} />
                    ))}
                  </div>
                </div>
              )}
              {type === "website" && (
                <div className="brief-field">
                  <label className="brief-label">Pages nécessaires</label>
                  <div className="brief-toggles">
                    {PAGE_TYPES.map((p) => (
                      <Toggle key={p} label={p} selected={pages.includes(p)} onToggle={() => toggleArr(pages, setPages, p)} />
                    ))}
                  </div>
                </div>
              )}
              {type === "website" && (
                <div className="brief-field">
                  <label className="brief-label">CTA principal</label>
                  <input className="brief-input" type="text" value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Ex: Commencer gratuitement, Nous contacter..." />
                </div>
              )}
              <div className="brief-field">
                <label className="brief-label">Fonctionnalités clés</label>
                <input className="brief-input" type="text" value={fonctionnalites} onChange={(e) => setFonctionnalites(e.target.value)} placeholder="Ex: authentification, tableau de bord, paiement..." />
              </div>
            </>
          )}

          {type === "branding" && (
            <>
              <div className="brief-field">
                <label className="brief-label">Références visuelles (optionnel)</label>
                <input className="brief-input" type="text" value={references} onChange={(e) => setReferences(e.target.value)} placeholder="Ex: Apple, Notion, Stripe..." />
              </div>
              <div className="brief-field">
                <label className="brief-label">Couleurs à éviter (optionnel)</label>
                <input className="brief-input" type="text" value={couleursEviter} onChange={(e) => setCouleursEviter(e.target.value)} placeholder="Ex: jaune vif, rose, orange..." />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="brief-modal-footer">
          <button type="button" className="brief-cancel-btn" onClick={onClose}>Annuler</button>
          <button type="button" className="brief-submit-btn" onClick={handleSubmit} disabled={!name.trim()}>
            Lancer la production →
          </button>
        </div>
      </div>
    </div>
  );
}
