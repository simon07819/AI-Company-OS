import fs from "fs";
import path from "path";
import { generateWithLlm } from "@/lib/ai/llmClient";

const ROOT = process.cwd();

// ─── Security Headers → next.config.js ───────────────────────────────────

const SECURITY_HEADERS = `
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:;" },
        ],
      },
    ];
  },`;

export async function addSecurityHeaders(): Promise<{ applied: boolean; detail: string }> {
  const configPath = path.join(ROOT, "next.config.js");
  if (!fs.existsSync(configPath)) {
    return { applied: false, detail: "next.config.js introuvable" };
  }

  const content = fs.readFileSync(configPath, "utf-8");
  if (/headers\s*\(\s*\)/.test(content) || /async\s+headers/.test(content)) {
    return { applied: false, detail: "Security headers déjà présents dans next.config.js" };
  }

  const patched = content.replace(
    /const\s+nextConfig\s*=\s*\{/,
    `const nextConfig = {${SECURITY_HEADERS}`,
  );

  if (patched === content) {
    // Fallback: rewrite config
    const fallback = `/** @type {import('next').NextConfig} */
const nextConfig = {${SECURITY_HEADERS}
};

module.exports = nextConfig;
`;
    fs.writeFileSync(configPath, fallback, "utf-8");
    return { applied: true, detail: "next.config.js réécrit avec security headers" };
  }

  fs.writeFileSync(configPath, patched, "utf-8");
  return { applied: true, detail: "Security headers ajoutés à next.config.js" };
}

// ─── .gitignore ───────────────────────────────────────────────────────────

const GITIGNORE_ENTRIES = `
# Environment variables — never commit credentials
.env
.env.local
.env.*.local
.env.production
.env.staging

# Dependencies
node_modules/

# Next.js build output
.next/
out/
dist/
build/
`;

export async function addGitignoreEntries(): Promise<{ applied: boolean; detail: string }> {
  const gitignorePath = path.join(ROOT, ".gitignore");
  const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf-8") : "";

  const lines: string[] = [];
  if (!/^\.env$/m.test(existing)) lines.push(".env", ".env.local", ".env.*.local", ".env.production", ".env.staging");
  if (!/^node_modules/m.test(existing)) lines.push("node_modules/");
  if (!/^\.next/m.test(existing)) lines.push(".next/", "out/", "dist/", "build/");

  if (!lines.length) return { applied: false, detail: ".gitignore déjà complet" };

  const toAppend = "\n# Auto-added by pre-launch auditor\n" + lines.join("\n") + "\n";
  fs.appendFileSync(gitignorePath, toAppend, "utf-8");
  return { applied: true, detail: `.gitignore mis à jour: ${lines.join(", ")}` };
}

// ─── Remove console.log with secrets ─────────────────────────────────────

export function removeConsoleLogSecrets(content: string): string {
  return content.replace(
    /console\.(log|warn|error|info)\s*\([^)]*(?:key|token|password|secret|api[_-]?key)[^)]*\)\s*;?\n?/gi,
    "// [auditor: removed console.log with sensitive data]\n",
  );
}

// ─── Privacy Policy Generation ────────────────────────────────────────────

export async function generatePrivacyPolicy(projectName: string, projectSummary?: string): Promise<string> {
  const today = new Date().toLocaleDateString("fr-CA");

  const llmResult = await generateWithLlm({
    system: `Tu es un expert juridique spécialisé en RGPD et confidentialité numérique.
Tu rédiges des politiques de confidentialité claires, légales et conformes RGPD.
Réponds uniquement avec le texte de la politique, en HTML simple, sans explications supplémentaires.`,
    user: `Rédige une politique de confidentialité RGPD complète pour le projet "${projectName}".
${projectSummary ? `Description: ${projectSummary}` : ""}
Date: ${today}

Inclure:
1. Introduction et identité du responsable de traitement
2. Données collectées et finalité
3. Base légale du traitement
4. Durée de conservation
5. Droits des utilisateurs (accès, rectification, suppression, opposition)
6. Politique cookies
7. Contact DPO / exercice des droits
8. Mise à jour de la politique

Format: HTML simple avec balises h2, p, ul/li. Langue française.`,
    purpose: "privacy_policy_generation",
    maxTokens: 2000,
  });

  if (llmResult.ok && llmResult.text.trim()) {
    return llmResult.text;
  }

  // Fallback: static template
  return `<h2>Politique de confidentialité</h2>
<p>Dernière mise à jour : ${today}</p>
<h2>1. Responsable du traitement</h2>
<p>${projectName} est responsable du traitement de vos données personnelles.</p>
<h2>2. Données collectées</h2>
<p>Nous collectons uniquement les données nécessaires au fonctionnement du service.</p>
<h2>3. Finalité du traitement</h2>
<p>Vos données sont utilisées pour fournir le service demandé et améliorer l'expérience utilisateur.</p>
<h2>4. Droits des utilisateurs</h2>
<p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour exercer ces droits, contactez-nous.</p>
<h2>5. Cookies</h2>
<p>Ce site peut utiliser des cookies techniques nécessaires au fonctionnement du service.</p>
<h2>6. Contact</h2>
<p>Pour toute question relative à vos données personnelles, contactez-nous via le formulaire de contact.</p>`;
}
