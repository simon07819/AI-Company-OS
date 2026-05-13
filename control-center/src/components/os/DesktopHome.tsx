"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Building2, Crown, Eye, FolderKanban, Sparkles } from "lucide-react";

interface HomeView {
  companies?: unknown[];
  projects?: unknown[];
  outputs?: unknown[];
}

export default function DesktopHome() {
  const [view, setView] = useState<HomeView>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/ceo/simple-agency", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (mounted) setView(payload.view ?? {});
      })
      .catch(() => {
        if (mounted) setView({});
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const companies = view.companies?.length ?? 0;
  const projects = view.projects?.length ?? 0;
  const outputs = view.outputs?.length ?? 0;
  const empty = !loading && companies === 0 && projects === 0 && outputs === 0;

  return (
    <main className="desktop-home">
      <section className="home-command-hero">
        <div className="home-orb"><Sparkles size={22} /></div>
        <span className="home-kicker">AI Company OS Desktop</span>
        <h1>{"Que veux-tu construire aujourd'hui?"}</h1>
        <p>
          Lance une entreprise, crée un projet, reçois un résultat traçable, puis décide quoi accepter ou modifier.
        </p>
        <div className="home-actions">
          <Link className="home-primary-action" href="/ceo">
            Parler au CEO <ArrowRight size={16} />
          </Link>
          <Link className="home-secondary-action" href="/companies">Voir mes entreprises</Link>
        </div>
      </section>

      {empty && (
        <section className="home-empty-state">
          <strong>Lance ta première entreprise avec le CEO AI</strong>
          <p>{"Commence avec une phrase simple. Le CEO crée l'entreprise, le projet et le premier résultat."}</p>
          <div>
            <span>Je veux lancer une compagnie de photo</span>
            <span>Je veux créer une marque de vêtements</span>
            <span>Je veux bâtir une agence marketing AI</span>
          </div>
        </section>
      )}

      <section className="desktop-launch-grid" aria-label="Launcher">
        <Link className="desktop-launch-card featured" href="/ceo">
          <Crown size={22} />
          <span>Command Center</span>
          <strong>CEO AI</strong>
          <p>Demande naturellement ce que tu veux construire.</p>
        </Link>
        <Link className="desktop-launch-card" href="/companies">
          <Building2 size={22} />
          <span>{companies} active{companies > 1 ? "s" : ""}</span>
          <strong>Entreprises</strong>
          <p>{"Les compagnies créées avec l'aide des agents."}</p>
        </Link>
        <Link className="desktop-launch-card" href="/projects">
          <FolderKanban size={22} />
          <span>{projects} en cours</span>
          <strong>Projets actifs</strong>
          <p>Les missions business sans bruit technique.</p>
        </Link>
        <Link className="desktop-launch-card" href="/outputs">
          <Eye size={22} />
          <span>{outputs} récent{outputs > 1 ? "s" : ""}</span>
          <strong>Résultats</strong>
          <p>Concepts, livrables, previews et décisions.</p>
        </Link>
      </section>
    </main>
  );
}
