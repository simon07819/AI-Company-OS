"use client";

import Link from "next/link";
import { ArrowRight, Download, FolderOpen, MessageSquare } from "lucide-react";

export default function ProjectActions({ slug, projectPath }: { slug: string; projectPath: string }) {
  return (
    <div className="project-workspace-actions">
      <Link className="os-button primary" href="/ceo">
        Continuer le projet <ArrowRight size={14} />
      </Link>
      <Link className="os-button subtle" href={`/ceo?project=${encodeURIComponent(slug)}`}>
        Modifier <MessageSquare size={14} />
      </Link>
      <a className="os-button subtle" href={`/${projectPath}/artifact-manifest.json`}>
        Exporter <Download size={14} />
      </a>
      <button className="os-button ghost" type="button" onClick={() => navigator.clipboard?.writeText(projectPath)}>
        Voir fichiers <FolderOpen size={14} />
      </button>
    </div>
  );
}
